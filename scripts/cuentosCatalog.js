import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getFileExtension,
  getSegmentStats,
  unpackCuento,
} from '../src/lib/cuentoFormat.js'

// Every .cuento dropped in public/cuentos is published with the site. This
// builds public/cuentos/index.json (plus extracted covers) so the library can
// list stories without downloading each file.

export const catalogDirectory = fileURLToPath(
  new URL('../public/cuentos', import.meta.url),
)
const coversDirectory = path.join(catalogDirectory, 'portadas')
const indexPath = path.join(catalogDirectory, 'index.json')

// Covers are updated in place instead of regenerating the folder: the Vite dev
// server only serves public files it has seen, and files recreated during
// startup can be missed.
function writeCoverIfChanged(coverFileName, bytes) {
  const coverPath = path.join(coversDirectory, coverFileName)

  if (existsSync(coverPath) && readFileSync(coverPath).equals(Buffer.from(bytes))) {
    return
  }

  mkdirSync(coversDirectory, { recursive: true })
  writeFileSync(coverPath, bytes)
}

function removeStaleCovers(coverFileNames) {
  if (!existsSync(coversDirectory) || !statSync(coversDirectory).isDirectory()) {
    return
  }

  for (const fileName of readdirSync(coversDirectory)) {
    if (!coverFileNames.has(fileName)) {
      rmSync(path.join(coversDirectory, fileName), { force: true })
    }
  }
}

export function buildCuentosCatalog() {
  mkdirSync(catalogDirectory, { recursive: true })

  const fileNames = readdirSync(catalogDirectory)
    .filter((fileName) => fileName.endsWith('.cuento'))
    .sort()
  const storiesById = new Map()
  const coverFileNames = new Set()
  const errors = []

  for (const fileName of fileNames) {
    const bytes = readFileSync(path.join(catalogDirectory, fileName))
    let cuento

    try {
      cuento = unpackCuento(bytes)
    } catch (error) {
      errors.push(`${fileName}: ${error.message}`)
      continue
    }

    const { manifest, cover } = cuento

    const duplicate = storiesById.get(manifest.id)

    if (duplicate && duplicate.updatedAt >= manifest.updatedAt) {
      errors.push(
        `${fileName}: es otra versión de ${duplicate.fileName}, que es más nueva; se ignora. Borrá uno de los dos.`,
      )
      continue
    }

    if (duplicate) {
      errors.push(
        `${duplicate.fileName}: es otra versión de ${fileName}, que es más nueva; se ignora. Borrá uno de los dos.`,
      )
    }

    // Content hash in the URL so browsers re-download a story when it changes.
    const version = createHash('sha256').update(bytes).digest('hex').slice(0, 12)
    let coverPath = null

    if (cover) {
      const coverFileName = `${manifest.id}.${getFileExtension(cover.name)}`
      writeCoverIfChanged(coverFileName, cover.bytes)
      coverFileNames.add(coverFileName)
      coverPath = `cuentos/portadas/${coverFileName}?v=${version}`
    }

    storiesById.set(manifest.id, {
      fileName,
      id: manifest.id,
      title: manifest.title,
      narrator: manifest.narrator ?? null,
      createdAt: manifest.createdAt,
      updatedAt: manifest.updatedAt,
      file: `cuentos/${encodeURIComponent(fileName)}?v=${version}`,
      cover: coverPath,
      ...getSegmentStats(manifest.segments),
    })
  }

  removeStaleCovers(coverFileNames)

  // Drop the internal fileName (used only for the duplicate warnings).
  const stories = [...storiesById.values()].map((story) => {
    const { fileName: _fileName, ...entry } = story
    return entry
  })

  writeFileSync(indexPath, `${JSON.stringify({ stories }, null, 2)}\n`)

  return { stories, errors }
}
