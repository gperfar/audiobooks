import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileIcon, PlusIcon } from '../components/Icons.jsx'
import { StoryCover } from '../components/StoryCover.jsx'
import { useAdminMode } from '../contexts/useAdminMode.js'
import {
  getAllStoriesWithSegmentStats,
  importStoryFile,
} from '../lib/storyApi.js'

function useStories() {
  const [stories, setStories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    getAllStoriesWithSegmentStats()
      .then((data) => {
        if (isMounted) {
          setStories(data)
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message || 'No se pudieron cargar los cuentos.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { stories, isLoading, errorMessage }
}

export function HomePage() {
  const { isAdminMode } = useAdminMode()
  const { stories, isLoading, errorMessage } = useStories()

  if (isLoading) {
    return <p className="py-16 text-center text-slate-500">Cargando cuentos...</p>
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {errorMessage}
      </div>
    )
  }

  return isAdminMode ? (
    <AdminLibrary stories={stories} />
  ) : (
    <AuroraLibrary stories={stories.filter((story) => story.isSynced)} />
  )
}

// --- Aurora mode --------------------------------------------------------------

function AuroraLibrary({ stories }) {
  if (stories.length === 0) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-[2rem] bg-white/70 p-8 text-center shadow-sm">
        <p className="story-text text-2xl font-bold text-amber-950">
          Todavía no hay cuentos
        </p>
        <p className="mt-3 text-sm text-amber-900/70">
          Para agregar uno, mantené apretado el candado de arriba.
        </p>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 short:grid-cols-4 short:gap-4">
      {stories.map((story) => (
        <li key={story.id}>
          <Link
            to={`/player/${story.id}`}
            className="block h-full overflow-hidden rounded-[1.75rem] bg-white shadow-md ring-1 ring-amber-900/5 transition active:scale-95 sm:hover:-translate-y-1 sm:hover:shadow-lg"
          >
            <StoryCover
              src={story.cover_image_url}
              title={story.title}
              seed={story.id}
              className="aspect-square w-full"
            />
            <div className="px-3 pb-4 pt-3 sm:px-4 short:pb-3 short:pt-2">
              <p className="story-text text-lg font-bold leading-snug text-slate-900 sm:text-xl short:text-base">
                {story.title}
              </p>
              {story.narrator ? (
                <p className="mt-1 text-sm font-semibold text-amber-800">
                  Leído por {story.narrator}
                </p>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

// --- Admin mode ---------------------------------------------------------------

function OpenStoryFileButton() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [isImporting, setIsImporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleFileChange(event) {
    const [file] = event.target.files ?? []
    event.target.value = ''

    if (!file) {
      return
    }

    setIsImporting(true)
    setErrorMessage('')

    try {
      const story = await importStoryFile(file)
      navigate(`/editor/${story.id}`)
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo abrir el archivo.')
      setIsImporting(false)
    }
  }

  return (
    <>
      {/* No accept filter: iOS greys out unknown extensions like .cuento. */}
      <input ref={inputRef} type="file" onChange={handleFileChange} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isImporting}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
      >
        <FileIcon className="h-4 w-4" />
        {isImporting ? 'Abriendo...' : 'Abrir .cuento'}
      </button>
      {errorMessage ? (
        <p className="w-full text-sm text-rose-700">{errorMessage}</p>
      ) : null}
    </>
  )
}

function getSyncStatus(story) {
  if (story.isSynced) {
    return { label: 'Listo para Aurora', className: 'bg-emerald-100 text-emerald-800' }
  }

  const missing = story.totalSegments - story.syncedSegments

  return {
    label:
      story.syncedSegments === 0
        ? 'Faltan marcar los tiempos'
        : `Faltan ${missing} ${missing === 1 ? 'frase' : 'frases'}`,
    className: 'bg-amber-100 text-amber-800',
  }
}

function getPublishStatus(story) {
  if (!story.isInCatalog) {
    return 'Solo en este dispositivo'
  }

  return story.isLocal ? 'Publicado, con cambios sin publicar' : 'Publicado'
}

function formatListenCount(value) {
  const count = Number(value) || 0
  return `${count} ${count === 1 ? 'escucha' : 'escuchas'}`
}

function AdminLibrary({ stories }) {
  const hiddenCount = stories.filter((story) => !story.isSynced).length

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Cuentos</h2>
          <p className="text-sm text-slate-500">
            {stories.length === 0
              ? 'Todavía no hay ninguno.'
              : hiddenCount > 0
                ? `Aurora ve solo los que están listos (${stories.length - hiddenCount} de ${stories.length}).`
                : `${stories.length} ${stories.length === 1 ? 'cuento' : 'cuentos'}, todos listos para Aurora.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OpenStoryFileButton />
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            <PlusIcon className="h-4 w-4" />
            Nuevo cuento
          </Link>
        </div>
      </div>

      {stories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-semibold text-slate-800">Empezá creando el primer cuento</p>
          <p className="mt-1 text-sm text-slate-500">
            Necesitás el audio y el texto. Si alguien te mandó un archivo .cuento,
            abrilo con el botón de arriba.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {stories.map((story) => {
            const syncStatus = getSyncStatus(story)

            return (
              <li
                key={story.id}
                className="flex gap-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200"
              >
                <Link to={`/editor/${story.id}`} className="shrink-0">
                  <StoryCover
                    src={story.cover_image_url}
                    title={story.title}
                    seed={story.id}
                    className="h-24 w-24 rounded-xl"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    to={`/editor/${story.id}`}
                    className="truncate font-bold text-slate-900 hover:text-violet-700"
                  >
                    {story.title}
                  </Link>
                  <p className="truncate text-sm text-slate-500">
                    {story.narrator ? `Leído por ${story.narrator}` : 'Sin narrador'}
                    {' · '}
                    {formatListenCount(story.listen_count)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
                    <span className={['rounded-full px-2 py-1', syncStatus.className].join(' ')}>
                      {syncStatus.label}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                      {getPublishStatus(story)}
                    </span>
                  </div>
                  <div className="mt-auto flex gap-2 pt-2 text-sm font-semibold">
                    <Link
                      to={`/editor/${story.id}`}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-white transition hover:bg-slate-700"
                    >
                      Editar
                    </Link>
                    <Link
                      to={`/player/${story.id}`}
                      className="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      Escuchar
                    </Link>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
