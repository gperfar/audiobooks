import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

// A .cuento file is a zip with a manifest.json, the audio track and an
// optional cover image. This module has no browser-only dependencies so the
// catalog build (vite.config.js) can reuse it from Node.

export const CUENTO_FORMAT = 'cuento'
export const CUENTO_VERSION = 1
export const MANIFEST_FILE_NAME = 'manifest.json'

const mimeTypesByExtension = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
  webm: 'audio/webm',
  flac: 'audio/flac',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
}

export function getFileExtension(fileName) {
  const match = /\.([a-z0-9]+)$/i.exec(fileName ?? '')
  return match ? match[1].toLowerCase() : ''
}

export function getMimeType(fileName) {
  return mimeTypesByExtension[getFileExtension(fileName)] ?? 'application/octet-stream'
}

export function getSegmentStats(segments) {
  const totalSegments = segments.length
  const syncedSegments = segments.filter(
    (segment) => typeof segment.start === 'number',
  ).length

  return {
    totalSegments,
    syncedSegments,
    isSynced: totalSegments > 0 && syncedSegments === totalSegments,
  }
}

export function createManifest({ id, title, audioFileName, coverFileName, sentences }) {
  const now = new Date().toISOString()

  return {
    format: CUENTO_FORMAT,
    version: CUENTO_VERSION,
    id,
    title,
    createdAt: now,
    updatedAt: now,
    audio: audioFileName,
    cover: coverFileName ?? null,
    segments: sentences.map((text) => ({ text, start: null, end: null })),
  }
}

// audio and cover are { name, bytes } where name is the path inside the zip.
export function packCuento({ manifest, audio, cover }) {
  const files = {
    [MANIFEST_FILE_NAME]: strToU8(JSON.stringify(manifest, null, 2)),
    // Audio and images are already compressed, so store them as-is.
    [audio.name]: [audio.bytes, { level: 0 }],
  }

  if (cover) {
    files[cover.name] = [cover.bytes, { level: 0 }]
  }

  return zipSync(files)
}

export function unpackCuento(bytes) {
  let files

  try {
    files = unzipSync(bytes)
  } catch {
    throw new Error('El archivo no es un .cuento válido.')
  }

  const manifestBytes = files[MANIFEST_FILE_NAME]

  if (!manifestBytes) {
    throw new Error('El archivo .cuento no tiene manifest.json.')
  }

  let manifest

  try {
    manifest = JSON.parse(strFromU8(manifestBytes))
  } catch {
    throw new Error('El manifest.json del cuento está dañado.')
  }

  if (manifest?.format !== CUENTO_FORMAT) {
    throw new Error('El archivo no es un .cuento válido.')
  }

  if (!(manifest.version <= CUENTO_VERSION)) {
    throw new Error(
      'Este cuento se creó con una versión más nueva de la app. Recarga la página e intenta de nuevo.',
    )
  }

  if (
    typeof manifest.id !== 'string' ||
    typeof manifest.title !== 'string' ||
    !Array.isArray(manifest.segments) ||
    !files[manifest.audio]
  ) {
    throw new Error('Al archivo .cuento le faltan datos obligatorios.')
  }

  return {
    manifest,
    audio: { name: manifest.audio, bytes: files[manifest.audio] },
    cover:
      manifest.cover && files[manifest.cover]
        ? { name: manifest.cover, bytes: files[manifest.cover] }
        : null,
  }
}
