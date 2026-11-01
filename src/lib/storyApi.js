import {
  createManifest,
  getFileExtension,
  getMimeType,
  getSegmentStats,
  packCuento,
  unpackCuento,
} from './cuentoFormat.js'
import {
  deleteStoredStory,
  getAllStoredStories,
  getStoredStory,
  putStoredStory,
  requestPersistentStorage,
} from './storyStorage.js'

const CATALOG_INDEX_PATH = 'cuentos/index.json'
const LISTEN_COUNTS_STORAGE_KEY = 'audiolibros-listen-counts'

function resolveAssetUrl(path) {
  return `${import.meta.env.BASE_URL}${path}`
}

// --- Published catalog (public/cuentos, indexed at build time) -------------

async function fetchCatalog() {
  try {
    const response = await fetch(resolveAssetUrl(CATALOG_INDEX_PATH), {
      cache: 'no-cache',
    })

    if (!response.ok) {
      return { stories: [], isAvailable: response.status === 404 }
    }

    const data = await response.json()
    return { stories: data.stories ?? [], isAvailable: true }
  } catch {
    // Offline: fall back to whatever is cached on this device.
    return { stories: [], isAvailable: false }
  }
}

async function downloadCatalogStory(entry) {
  const response = await fetch(resolveAssetUrl(entry.file))

  if (!response.ok) {
    throw new Error('No se pudo descargar el cuento.')
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  const record = {
    ...recordFromCuento(bytes),
    kind: 'cache',
    sourceUrl: entry.file,
  }

  await putStoredStory(record)
  return record
}

// --- Records <-> .cuento files ----------------------------------------------

function recordFromCuento(bytes) {
  const { manifest, audio, cover } = unpackCuento(bytes)

  return {
    id: manifest.id,
    manifest,
    audio: new Blob([audio.bytes], { type: getMimeType(audio.name) }),
    cover: cover ? new Blob([cover.bytes], { type: getMimeType(cover.name) }) : null,
  }
}

async function cuentoFromRecord(record) {
  const { manifest } = record

  return packCuento({
    manifest,
    audio: {
      name: manifest.audio,
      bytes: new Uint8Array(await record.audio.arrayBuffer()),
    },
    cover: record.cover
      ? {
          name: manifest.cover,
          bytes: new Uint8Array(await record.cover.arrayBuffer()),
        }
      : null,
  })
}

async function loadStoryRecord(storyId) {
  const storedRecord = await getStoredStory(storyId)

  if (storedRecord?.kind === 'local') {
    return storedRecord
  }

  const catalog = await fetchCatalog()
  const entry = catalog.stories.find((story) => story.id === storyId)

  if (!entry) {
    if (storedRecord) {
      return storedRecord
    }

    throw new Error('No encontramos este cuento.')
  }

  if (storedRecord?.sourceUrl === entry.file) {
    return storedRecord
  }

  try {
    return await downloadCatalogStory(entry)
  } catch (error) {
    if (storedRecord) {
      return storedRecord
    }

    throw error
  }
}

// Edits are read-modify-write on the whole record, so run them one at a time:
// with autosave, a title save and a timing save can overlap.
let writeQueue = Promise.resolve()

function updateStoryRecord(storyId, applyChanges) {
  const result = writeQueue.then(() => applyStoryRecordUpdate(storyId, applyChanges))
  writeQueue = result.catch(() => {})
  return result
}

async function applyStoryRecordUpdate(storyId, applyChanges) {
  const record = await loadStoryRecord(storyId)
  const changes = applyChanges(record)
  const nextRecord = {
    ...record,
    ...changes,
    kind: 'local',
    sourceUrl: undefined,
    manifest: {
      ...record.manifest,
      ...changes.manifest,
      updatedAt: new Date().toISOString(),
    },
  }

  await putStoredStory(nextRecord)
  requestPersistentStorage()
  return nextRecord
}

// --- Object URLs --------------------------------------------------------------

// Blobs read from IndexedDB are new objects each time, so keep one URL per
// story slot and revoke the previous one instead of leaking it.
const objectUrlsBySlot = new Map()

function createObjectUrl(slot, blob) {
  const previousUrl = objectUrlsBySlot.get(slot)

  if (previousUrl) {
    URL.revokeObjectURL(previousUrl)
  }

  if (!blob) {
    objectUrlsBySlot.delete(slot)
    return null
  }

  const url = URL.createObjectURL(blob)
  objectUrlsBySlot.set(slot, url)
  return url
}

// --- Listen counts (per device) ---------------------------------------------

function readListenCounts() {
  try {
    return JSON.parse(window.localStorage.getItem(LISTEN_COUNTS_STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

function getListenCount(storyId) {
  return Number(readListenCounts()[storyId]) || 0
}

export function incrementStoryListenCount(storyId) {
  const listenCounts = readListenCounts()
  const nextCount = (Number(listenCounts[storyId]) || 0) + 1

  listenCounts[storyId] = nextCount
  window.localStorage.setItem(LISTEN_COUNTS_STORAGE_KEY, JSON.stringify(listenCounts))
  return nextCount
}

// --- Public API used by the pages -------------------------------------------

export async function getAllStoriesWithSegmentStats() {
  const [catalog, storedRecords] = await Promise.all([
    fetchCatalog(),
    getAllStoredStories(),
  ])
  const catalogIds = new Set(catalog.stories.map((story) => story.id))
  const storedById = new Map(storedRecords.map((record) => [record.id, record]))
  const stories = []

  for (const entry of catalog.stories) {
    const storedRecord = storedById.get(entry.id)

    if (storedRecord?.kind === 'local') {
      continue
    }

    stories.push({
      id: entry.id,
      title: entry.title,
      narrator: entry.narrator ?? null,
      created_at: entry.createdAt,
      cover_image_url: entry.cover ? resolveAssetUrl(entry.cover) : null,
      listen_count: getListenCount(entry.id),
      isInCatalog: true,
      isLocal: false,
      totalSegments: entry.totalSegments,
      syncedSegments: entry.syncedSegments,
      isSynced: entry.isSynced,
    })
  }

  for (const record of storedRecords) {
    const isInCatalog = catalogIds.has(record.id)

    if (record.kind === 'cache' && (isInCatalog || catalog.isAvailable)) {
      // Either listed above, or removed from the published catalog.
      if (!isInCatalog) {
        deleteStoredStory(record.id).catch(() => {})
      }

      continue
    }

    stories.push({
      id: record.id,
      title: record.manifest.title,
      narrator: record.manifest.narrator ?? null,
      created_at: record.manifest.createdAt,
      cover_image_url: createObjectUrl(`${record.id}:cover`, record.cover),
      listen_count: getListenCount(record.id),
      isInCatalog,
      isLocal: record.kind === 'local',
      ...getSegmentStats(record.manifest.segments),
    })
  }

  return stories.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
}

export async function fetchStoryWithSegments(storyId) {
  const record = await loadStoryRecord(storyId)
  const catalog = await fetchCatalog()
  const { manifest } = record

  return {
    id: record.id,
    title: manifest.title,
    narrator: manifest.narrator ?? null,
    audio_url: createObjectUrl(`${record.id}:audio`, record.audio),
    audio_format: getFileExtension(manifest.audio),
    cover_image_url: createObjectUrl(`${record.id}:cover`, record.cover),
    listen_count: getListenCount(record.id),
    created_at: manifest.createdAt,
    isInCatalog: catalog.stories.some((story) => story.id === record.id),
    isLocal: record.kind === 'local',
    segments: manifest.segments.map((segment, index) => ({
      id: String(index),
      text: segment.text,
      start_time: segment.start ?? null,
      end_time: segment.end ?? null,
      order: index,
    })),
  }
}

export async function createStory({
  title,
  narrator,
  audioFile,
  coverImageFile,
  sentences,
}) {
  const id = crypto.randomUUID()
  const audioFileName = `audio.${getFileExtension(audioFile.name) || 'mp3'}`
  const coverFileName = coverImageFile
    ? `cover.${getFileExtension(coverImageFile.name) || 'jpg'}`
    : null

  await putStoredStory({
    id,
    kind: 'local',
    manifest: createManifest({
      id,
      title,
      narrator,
      audioFileName,
      coverFileName,
      sentences,
    }),
    audio: new Blob([audioFile], { type: getMimeType(audioFileName) }),
    cover: coverImageFile
      ? new Blob([coverImageFile], { type: getMimeType(coverFileName) })
      : null,
  })
  requestPersistentStorage()

  return { id }
}

export async function updateStoryDetails(storyId, { title, narrator }) {
  await updateStoryRecord(storyId, () => ({
    manifest: { title, narrator: narrator || null },
  }))
  return { id: storyId, title, narrator: narrator || null, isLocal: true }
}

export async function updateStoryCoverImage(storyId, coverImageFile) {
  const coverFileName = `cover.${getFileExtension(coverImageFile.name) || 'jpg'}`
  const record = await updateStoryRecord(storyId, () => ({
    cover: new Blob([coverImageFile], { type: getMimeType(coverFileName) }),
    manifest: { cover: coverFileName },
  }))

  return {
    id: storyId,
    cover_image_url: createObjectUrl(`${storyId}:cover`, record.cover),
    isLocal: true,
  }
}

export async function updateSegmentText(storyId, segmentId, text) {
  const segmentIndex = Number(segmentId)

  await updateStoryRecord(storyId, ({ manifest }) => ({
    manifest: {
      segments: manifest.segments.map((segment, index) =>
        index === segmentIndex ? { ...segment, text } : segment,
      ),
    },
  }))

  return { id: segmentId, text }
}

export async function saveSegmentsTiming(storyId, segments) {
  await updateStoryRecord(storyId, ({ manifest }) => ({
    manifest: {
      segments: manifest.segments.map((segment, index) => ({
        ...segment,
        start: segments[index]?.start_time ?? null,
        end: segments[index]?.end_time ?? null,
      })),
    },
  }))
}

// Removes the copy on this device. A story that is also in the published
// catalog falls back to the published version.
export async function deleteStory(storyId) {
  await deleteStoredStory(storyId)
}

export async function importStoryFile(file) {
  const record = recordFromCuento(new Uint8Array(await file.arrayBuffer()))

  await putStoredStory({ ...record, kind: 'local' })
  requestPersistentStorage()

  return { id: record.id, title: record.manifest.title }
}

function slugify(value) {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cuento'
  )
}

export async function downloadStoryFile(storyId) {
  const record = await loadStoryRecord(storyId)
  const bytes = await cuentoFromRecord(record)
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }))
  const link = document.createElement('a')

  link.href = url
  link.download = `${slugify(record.manifest.title)}.cuento`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
