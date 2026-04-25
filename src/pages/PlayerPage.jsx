import { useEffect, useMemo, useRef, useState } from 'react'
import { Howl } from 'howler'
import { Link, useParams } from 'react-router-dom'
import { StoryCover } from '../components/StoryCover.jsx'
import { useAdminMode } from '../contexts/useAdminMode.js'
import {
  fetchStoryWithSegments,
  incrementStoryListenCount,
} from '../lib/storyApi.js'
import { findActiveSegment } from '../utils/editorTiming.js'

function formatTime(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--:--'
  }

  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getPlaybackPositionKey(storyId) {
  return `story-player-position:${storyId}`
}

function loadSavedPlaybackPosition(storyId) {
  if (!storyId) {
    return 0
  }

  const rawValue = window.localStorage.getItem(getPlaybackPositionKey(storyId))
  const parsedValue = Number(rawValue)

  return Number.isFinite(parsedValue) ? parsedValue : 0
}

function savePlaybackPosition(storyId, time) {
  if (!storyId) {
    return
  }

  window.localStorage.setItem(getPlaybackPositionKey(storyId), String(time))
}

function formatListenCount(value) {
  const count = Number(value) || 0
  return `${count} ${count === 1 ? 'escucha' : 'escuchas'}`
}

export function PlayerPage() {
  const { storyId } = useParams()
  const { isAdminMode } = useAdminMode()
  const soundRef = useRef(null)
  const animationFrameRef = useRef(null)
  const segmentRefs = useRef({})
  const hasCountedListenRef = useRef(false)

  const [story, setStory] = useState(null)
  const [segments, setSegments] = useState([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasEnded, setHasEnded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const syncedSegments = useMemo(
    () =>
      segments.filter((segment) => typeof segment.start_time === 'number'),
    [segments],
  )

  const activeSegment = useMemo(
    () => findActiveSegment(syncedSegments, currentTime),
    [syncedSegments, currentTime],
  )

  const visibleActiveSegment = useMemo(() => {
    if (activeSegment) {
      return activeSegment
    }

    if (hasEnded && syncedSegments.length > 0) {
      return syncedSegments[syncedSegments.length - 1]
    }

    return null
  }, [activeSegment, hasEnded, syncedSegments])

  useEffect(() => {
    let isMounted = true

    async function loadStory() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await fetchStoryWithSegments(storyId)

        if (!isMounted) {
          return
        }

        setStory(data)
        setSegments(data.segments)
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || 'No se pudo cargar el reproductor del cuento.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadStory()

    return () => {
      isMounted = false
    }
  }, [storyId])

  useEffect(() => {
    if (!story?.audio_url) {
      return undefined
    }

    const initialPosition = loadSavedPlaybackPosition(storyId)
    const sound = new Howl({
      src: [story.audio_url],
      html5: true,
      onload: () => {
        const audioDuration = Number(sound.duration() || 0)
        setDuration(audioDuration)

        if (initialPosition > 0 && initialPosition < audioDuration) {
          sound.seek(initialPosition)
          setCurrentTime(initialPosition)
        }
      },
      onloaderror: () => {
        setErrorMessage('No se pudo cargar el audio del cuento.')
      },
      onplay: () => {
        setIsPlaying(true)
        setHasEnded(false)
      },
      onpause: () => {
        const pausedAt = Number(sound.seek() || 0)
        setIsPlaying(false)
        setCurrentTime(pausedAt)
        savePlaybackPosition(storyId, pausedAt)
      },
      onstop: () => {
        setIsPlaying(false)
        setHasEnded(false)
        setCurrentTime(0)
        savePlaybackPosition(storyId, 0)
      },
      onend: () => {
        const endedAt = Number(sound.duration() || 0)
        setIsPlaying(false)
        setHasEnded(true)
        setCurrentTime(endedAt)
        savePlaybackPosition(storyId, endedAt)
      },
    })

    soundRef.current = sound

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (soundRef.current) {
        savePlaybackPosition(storyId, Number(soundRef.current.seek() || 0))
      }

      sound.unload()
      soundRef.current = null
    }
  }, [story?.audio_url, storyId])

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      return undefined
    }

    function updateAudioTime() {
      const sound = soundRef.current

      if (!sound) {
        return
      }

      const nextTime = Number(sound.seek() || 0)
      setCurrentTime(nextTime)
      animationFrameRef.current = requestAnimationFrame(updateAudioTime)
    }

    animationFrameRef.current = requestAnimationFrame(updateAudioTime)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying])

  useEffect(() => {
    if (!visibleActiveSegment?.id) {
      return
    }

    const element = segmentRefs.current[visibleActiveSegment.id]
    element?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [visibleActiveSegment?.id])

  function handleTogglePlayback() {
    const sound = soundRef.current

    if (!sound) {
      return
    }

    if (sound.playing()) {
      sound.pause()
      return
    }

    if (hasEnded) {
      sound.seek(0)
      setCurrentTime(0)
      setHasEnded(false)
      savePlaybackPosition(storyId, 0)
    }

    if (!hasCountedListenRef.current && storyId) {
      hasCountedListenRef.current = true
      const currentListenCount = Number(story?.listen_count) || 0

      setStory((currentStory) => ({
        ...currentStory,
        listen_count: currentListenCount + 1,
      }))

      incrementStoryListenCount(storyId, currentListenCount).catch((error) => {
        setStory((currentStory) => ({
          ...currentStory,
          listen_count: currentListenCount,
        }))
        setErrorMessage(
          error.message || 'No se pudo guardar el contador de escuchas.',
        )
      })
    }

    sound.play()
  }

  if (isLoading) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <p className="text-sm text-slate-600">Cargando reproductor del cuento...</p>
      </section>
    )
  }

  if (errorMessage && !story) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <p className="text-sm text-rose-700">{errorMessage}</p>
      </section>
    )
  }

  return (
    <div className="relative -mx-4 min-h-[calc(100vh-12rem)] bg-[radial-gradient(circle_at_top,_#fff7ed,_#fefce8_45%,_#eff6ff)] px-4 pb-36 pt-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-5xl flex-col">
        <section className="mx-auto w-full max-w-3xl text-center">
          <div className="mb-5 flex justify-center">
            <StoryCover
              src={story?.cover_image_url}
              title={story?.title}
              className="h-44 w-32 rounded-[2rem] shadow-lg ring-4 ring-white/70 sm:h-56 sm:w-40"
            />
          </div>

          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
            Audiolibros de Aurora
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            {story?.title}
          </h2>
          <p className="mt-3 text-base text-slate-600 sm:text-lg">
            Escucha y sigue cada frase mientras se ilumina.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-slate-500 sm:text-base">
            <span>{formatTime(currentTime)}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{formatTime(duration)}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{formatListenCount(story?.listen_count)}</span>
          </div>

          {isAdminMode ? (
            <div className="mt-5">
              <Link
                to={storyId ? `/editor/${storyId}` : '/'}
                className="inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 backdrop-blur transition hover:text-slate-900"
              >
                Editar
              </Link>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-700 shadow-sm">
              {errorMessage}
            </div>
          ) : null}
        </section>

        <section className="flex flex-1 items-center justify-center py-8 sm:py-12">
          {syncedSegments.length === 0 ? (
            <div className="w-full max-w-2xl rounded-[2rem] bg-white/80 p-10 text-center shadow-sm ring-1 ring-amber-100 backdrop-blur">
              <p className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Este cuento todavía no está sincronizado
              </p>
              <p className="mt-4 text-base leading-8 text-slate-600 sm:text-lg">
                Agrega tiempos en el editor antes de usar el reproductor.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-3xl space-y-7 sm:space-y-9">
              {segments.length !== syncedSegments.length ? (
                <p className="text-center text-sm text-slate-500">
                  Aquí solo se muestran las frases que ya tienen tiempo guardado.
                </p>
              ) : null}

              {syncedSegments.map((segment) => {
                const isActive = visibleActiveSegment?.id === segment.id

                return (
                  <div
                    key={segment.id}
                    ref={(element) => {
                      if (element) {
                        segmentRefs.current[segment.id] = element
                      }
                    }}
                    className={[
                      'rounded-[2rem] px-6 py-5 text-center transition-all duration-300 sm:px-8 sm:py-6',
                      isActive
                        ? 'scale-[1.02] bg-white/95 shadow-lg ring-2 ring-amber-200'
                        : 'bg-transparent',
                    ].join(' ')}
                  >
                    <p
                      className={[
                        'mx-auto max-w-3xl text-3xl leading-[1.7] text-slate-700 transition-all duration-300 sm:text-4xl md:text-5xl',
                        isActive
                          ? 'font-semibold text-slate-950'
                          : 'font-medium opacity-85',
                      ].join(' ')}
                    >
                      {segment.text}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-amber-100 via-amber-100/95 to-transparent px-4 pb-5 pt-10 sm:px-6 lg:px-8">
        <div className="pointer-events-auto mx-auto flex max-w-3xl items-center justify-center">
          <button
            type="button"
            onClick={handleTogglePlayback}
            className="inline-flex min-h-16 w-full max-w-md items-center justify-center rounded-full bg-slate-900 px-8 py-5 text-xl font-semibold text-white shadow-xl transition hover:bg-slate-800 sm:min-h-20 sm:text-2xl"
          >
            {isPlaying ? 'Pausar cuento' : 'Escuchar cuento'}
          </button>
        </div>
      </div>
    </div>
  )
}
