import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { buildCuentosCatalog, catalogDirectory } from './scripts/cuentosCatalog.js'

function cuentosCatalog() {
  let logger

  function rebuildCatalog() {
    const { stories, errors } = buildCuentosCatalog()

    for (const error of errors) {
      logger.warn(`[cuentos] ${error}`)
    }

    logger.info(`[cuentos] ${stories.length} cuento(s) publicados en el catálogo`)
  }

  return {
    name: 'cuentos-catalog',
    configResolved(config) {
      logger = config.logger
    },
    buildStart() {
      rebuildCatalog()
    },
    configureServer(server) {
      function handleFileEvent(filePath) {
        if (filePath.startsWith(catalogDirectory) && filePath.endsWith('.cuento')) {
          rebuildCatalog()
          server.ws.send({ type: 'full-reload' })
        }
      }

      server.watcher.on('add', handleFileEvent)
      server.watcher.on('change', handleFileEvent)
      server.watcher.on('unlink', handleFileEvent)
    },
  }
}

// "owner/repo" for the Publicar button's GitHub links: from GitHub Actions
// when deploying, otherwise from the local git remote.
function getGithubRepository() {
  if (process.env.GITHUB_REPOSITORY) {
    return process.env.GITHUB_REPOSITORY
  }

  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' })
    return /github\.com[:/]([^/]+\/[^/.\s]+)/.exec(remoteUrl)?.[1] ?? ''
  } catch {
    return ''
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative base + hash routing: works from any static host or subpath
  // (e.g. GitHub Pages at /audiobooks/) without server rewrites.
  base: './',
  plugins: [react(), tailwindcss(), cuentosCatalog()],
  define: {
    'import.meta.env.VITE_GITHUB_REPOSITORY': JSON.stringify(getGithubRepository()),
  },
})
