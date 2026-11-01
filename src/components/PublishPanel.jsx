import { useState } from 'react'
import { Link } from 'react-router-dom'
import { downloadStoryFile, shareStoryFile } from '../lib/storyApi.js'
import { canOpenGithubUpload, getGithubUploadUrl } from '../lib/publishing.js'
import { DownloadIcon, TrashIcon } from './Icons.jsx'

function getStatus(story) {
  if (!story.isInCatalog) {
    return {
      label: 'Solo en este dispositivo',
      detail: 'Para que Aurora lo vea en cualquier celular o tablet, mandale el archivo a quien publica los cuentos.',
      className: 'bg-amber-100 text-amber-800',
    }
  }

  if (story.isLocal) {
    return {
      label: 'Cambios sin publicar',
      detail: 'Los cambios solo se ven en este dispositivo. Mandá el archivo de nuevo para que los publiquen.',
      className: 'bg-amber-100 text-amber-800',
    }
  }

  return {
    label: 'Publicado',
    detail: 'Aurora lo ve en todos los dispositivos.',
    className: 'bg-emerald-100 text-emerald-800',
  }
}

const resultMessages = {
  shared: (fileName) => `Listo, se compartió ${fileName}.`,
  downloaded: (fileName) =>
    `Se descargó ${fileName}. Mandalo por WhatsApp o mail a quien publica los cuentos.`,
}

export function PublishPanel({ story, missingCount, onDelete }) {
  const [resultMessage, setResultMessage] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const status = getStatus(story)
  const needsPublishing = !story.isInCatalog || story.isLocal

  async function run(action) {
    setIsWorking(true)
    setErrorMessage('')
    setResultMessage('')

    try {
      await action()
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo generar el archivo .cuento.')
    } finally {
      setIsWorking(false)
    }
  }

  function handleShare() {
    run(async () => {
      const { fileName, method } = await shareStoryFile(story.id)
      setResultMessage(resultMessages[method]?.(fileName) ?? '')
    })
  }

  function handleDownload() {
    run(async () => {
      const fileName = await downloadStoryFile(story.id)
      setResultMessage(resultMessages.downloaded(fileName))
    })
  }

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">Publicar</h3>
        <span className={['rounded-full px-2 py-1 text-xs font-bold', status.className].join(' ')}>
          {status.label}
        </span>
      </div>
      <p className="text-sm text-slate-600">{status.detail}</p>

      {needsPublishing && missingCount > 0 ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Faltan marcar {missingCount} {missingCount === 1 ? 'frase' : 'frases'}: hasta
          que estén todas, Aurora no lo va a ver aunque esté publicado.
        </p>
      ) : null}

      {needsPublishing ? (
        <button
          type="button"
          onClick={handleShare}
          disabled={isWorking}
          className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:bg-violet-300"
        >
          {isWorking ? 'Preparando...' : 'Compartir .cuento'}
        </button>
      ) : null}

      {resultMessage ? (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {resultMessage}
        </p>
      ) : null}

      {errorMessage ? <p className="text-sm font-semibold text-rose-700">{errorMessage}</p> : null}

      {needsPublishing && canOpenGithubUpload ? (
        <details className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
          <summary className="cursor-pointer font-semibold">¿Publicás vos? Subilo a GitHub</summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            <li>Descargá el archivo (abajo, “Descargar”).</li>
            <li>
              Abrí la{' '}
              <a
                href={getGithubUploadUrl()}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-violet-700 underline"
              >
                carpeta de cuentos en GitHub
              </a>
              , arrastrá el archivo y tocá <strong>Commit changes</strong>.
              {story.isInCatalog ? ' Tiene el mismo nombre que el publicado, así que lo reemplaza.' : ''}
            </li>
            <li>En uno o dos minutos aparece en la app para todos.</li>
          </ol>
        </details>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-sm font-semibold">
        <Link to={`/player/${story.id}`} className="text-slate-700 hover:text-slate-900">
          Ver como Aurora
        </Link>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isWorking}
          className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 disabled:opacity-50"
        >
          <DownloadIcon className="h-4 w-4" />
          Descargar
        </button>
        {needsPublishing ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-800"
          >
            <TrashIcon className="h-4 w-4" />
            {story.isInCatalog ? 'Descartar cambios' : 'Borrar'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
