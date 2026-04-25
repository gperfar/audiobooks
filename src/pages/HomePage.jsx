import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StoryCover } from '../components/StoryCover.jsx'
import { useAdminMode } from '../contexts/useAdminMode.js'
import { getAllStoriesWithSegmentStats } from '../lib/storyApi.js'

function formatCreatedAt(value) {
  if (!value) {
    return 'Agregado hace poco'
  }

  return new Intl.DateTimeFormat('es-ES', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatListenCount(value) {
  const count = Number(value) || 0
  return `${count} ${count === 1 ? 'escucha' : 'escuchas'}`
}

export function HomePage() {
  const navigate = useNavigate()
  const { isAdminMode } = useAdminMode()
  const [stories, setStories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadStories() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await getAllStoriesWithSegmentStats()

        if (!isMounted) {
          return
        }

        setStories(data)
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || 'No se pudo cargar la biblioteca.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadStories()

    return () => {
      isMounted = false
    }
  }, [])

  if (isLoading) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <p className="text-sm text-slate-600">Cargando biblioteca...</p>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      </section>
    )
  }

  if (stories.length === 0) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="mx-auto max-w-2xl rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center sm:p-12">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            Todavía no hay cuentos
          </h2>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Sube tu primer cuento para empezar a sincronizarlo y escucharlo.
          </p>
          <Link
            to="/upload"
            className="mt-6 inline-flex rounded-2xl bg-slate-900 px-5 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
          >
            Subir mi primer cuento
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Todos los cuentos
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Elige un cuento para escuchar o, si estás en modo admin, para editarlo.
          </p>
        </div>

        {isAdminMode ? (
          <Link
            to="/upload"
            className="inline-flex rounded-2xl bg-slate-900 px-5 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
          >
            Subir cuento
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {stories.map((story) => (
          <article
            key={story.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/player/${story.id}`)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                navigate(`/player/${story.id}`)
              }
            }}
            className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <StoryCover
              src={story.cover_image_url}
              title={story.title}
              className="h-48 w-full"
            />

            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {formatCreatedAt(story.created_at)}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    {story.title}
                  </h3>
                </div>

                <span
                  className={[
                    'mt-1 inline-flex h-4 w-4 rounded-full',
                    story.isSynced ? 'bg-emerald-400' : 'bg-slate-300',
                  ].join(' ')}
                  aria-label={story.isSynced ? 'Sincronizado' : 'Sin sincronizar'}
                  title={story.isSynced ? 'Sincronizado' : 'Sin sincronizar'}
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-2 font-medium">
                  {formatListenCount(story.listen_count)}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={`/player/${story.id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex min-w-28 items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Escuchar
                </Link>
                {isAdminMode ? (
                  <Link
                    to={`/editor/${story.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex min-w-28 items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Editar
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
