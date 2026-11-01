import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  HomeIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  ReplayIcon,
} from '../components/Icons.jsx'
import { StoryCover } from '../components/StoryCover.jsx'
import { useAdminMode } from '../contexts/useAdminMode.js'
import { useFitText } from '../hooks/useFitText.js'
import { useStoryAudio } from '../hooks/useStoryAudio.js'
import {
  fetchStoryWithSegments,
  incrementStoryListenCount,
} from '../lib/storyApi.js'
import { findActiveSegment } from '../utils/editorTiming.js'
import { formatTime } from '../utils/formatTime.js'

// Keep the screen on while a story plays (where supported).
function useWakeLock(isActive) {
  useEffect(() => {
    if (!isActive || !navigator.wakeLock) {
      return undefined
    }

    let wakeLock = null
    let isCancelled = false

    navigator.wakeLock
      .request('screen')
      .then((lock) => {
        if (isCancelled) {
          lock.release()
        } else {
          wakeLock = lock
        }
      })
      .catch(() => {})

    return () => {
      isCancelled = true
      wakeLock?.release().catch(() => {})
    }
  }, [isActive])
}

function FittedSentence({ text }) {
  const { containerRef, textRef } = useFitText(text)

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
      <p
        ref={textRef}
        className="story-text animate-sentence-in max-w-3xl text-center font-bold leading-snug text-slate-900"
      >
        {text}
      </p>
    </div>
  )
}

export function PlayerPage() {
  const { storyId } = useParams()
  const { isAdminMode } = useAdminMode()
  const hasCountedListenRef = useRef(false)

  const [story, setStory] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let isMounted = true

    fetchStoryWithSegments(storyId)
      .then((data) => {
        if (isMounted) {
          setStory(data)
        }
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(error.message || 'No se pudo abrir el cuento.')
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
  }, [storyId])

  // Always starts from the beginning: leaving to the library and opening the
  // story again is how it gets reset.
  const audio = useStoryAudio(story?.audio_url)

  useWakeLock(audio.isPlaying)

  const segments = useMemo(() => story?.segments ?? [], [story])
  const syncedSegments = useMemo(
    () => segments.filter((segment) => typeof segment.start_time === 'number'),
    [segments],
  )
  const isSynced = syncedSegments.length > 0

  const activeSegment = findActiveSegment(syncedSegments, audio.currentTime)
  const visibleSegment =
    activeSegment ??
    (audio.hasEnded ? syncedSegments.at(-1) : syncedSegments[0]) ??
    null

  useEffect(() => {
    if (!story || !('mediaSession' in navigator)) {
      return
    }

    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: story.title,
      artist: story.narrator ? `Leído por ${story.narrator}` : 'Cuentos de Aurora',
      artwork: story.cover_image_url ? [{ src: story.cover_image_url }] : [],
    })
  }, [story])

  const handleTogglePlayback = useCallback(() => {
    if (!audio.isPlaying && !hasCountedListenRef.current) {
      hasCountedListenRef.current = true
      const nextListenCount = incrementStoryListenCount(storyId)
      setStory((currentStory) => ({ ...currentStory, listen_count: nextListenCount }))
    }

    audio.toggle()
  }, [audio, storyId])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.code === 'Space' && event.target === document.body) {
        event.preventDefault()
        handleTogglePlayback()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleTogglePlayback])

  if (isLoading) {
    return <p className="py-24 text-center text-amber-900/60">Abriendo el cuento...</p>
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-24 text-center">
        <p className="text-lg font-semibold text-slate-800">{loadError}</p>
        <Link to="/" className="inline-flex rounded-full bg-slate-900 px-5 py-3 font-semibold text-white">
          Volver a los cuentos
        </Link>
      </div>
    )
  }

  const progress = audio.duration > 0 ? audio.currentTime / audio.duration : 0
  const playLabel = audio.isPlaying ? 'Pausar' : audio.hasEnded ? 'Escuchar otra vez' : 'Escuchar'

  return (
    <div
      className={[
        'flex flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_#fff7ed,_#fef3c7_55%,_#fde68a)]',
        // The whole player fits the screen so the play button is always
        // visible. In admin mode the shell's top bar takes some height.
        isAdminMode ? '-mx-4 -mt-6 h-[calc(100dvh-4rem)] sm:-mx-6' : 'h-dvh',
      ].join(' ')}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-3 px-4 pb-5 pt-4 sm:px-6 short:gap-2 short:pb-3 short:pt-3">
        <div className="flex shrink-0 items-center gap-3 sm:gap-5 short:gap-3">
          {!isAdminMode ? (
            <Link
              to="/"
              aria-label="Volver a los cuentos"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-amber-900 shadow-md transition active:scale-90 short:h-12 short:w-12"
            >
              <HomeIcon className="h-7 w-7" />
            </Link>
          ) : null}

          <StoryCover
            src={story.cover_image_url}
            title={story.title}
            seed={story.id}
            className="h-16 w-16 shrink-0 rounded-2xl shadow-md sm:h-24 sm:w-24 short:h-12 short:w-12 short:rounded-xl"
          />

          <div className="min-w-0 flex-1">
            <h2 className="story-text truncate text-xl font-bold leading-tight text-amber-950 sm:text-3xl short:text-lg">
              {story.title}
            </h2>
            {story.narrator ? (
              <p className="mt-0.5 truncate text-sm font-semibold text-amber-800 sm:text-base short:text-sm">
                Leído por {story.narrator}
              </p>
            ) : null}
          </div>

          {isAdminMode ? (
            <Link
              to={`/editor/${story.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
            >
              <PencilIcon className="h-4 w-4" />
              Editar
            </Link>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 short:flex-row short:items-stretch short:gap-6">
          <section className="flex min-h-0 min-w-0 flex-1 flex-col">
            {isSynced ? (
              visibleSegment ? (
                <FittedSentence key={visibleSegment.id} text={visibleSegment.text} />
              ) : null
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto py-4 text-center">
                {isAdminMode ? (
                  <p className="mb-3 text-sm font-semibold text-amber-800">
                    Este cuento todavía no tiene tiempos marcados: se muestra el texto completo.
                  </p>
                ) : null}
                <p className="story-text text-2xl leading-relaxed text-slate-800 sm:text-3xl">
                  {segments.map((segment) => segment.text).join(' ')}
                </p>
              </div>
            )}
          </section>

          <div className="flex shrink-0 flex-col gap-4 short:w-32 short:flex-col-reverse short:justify-center short:gap-3">
            {audio.errorMessage ? (
              <p className="text-center text-sm font-semibold text-rose-700">{audio.errorMessage}</p>
            ) : null}

            {isAdminMode ? (
              <div className="flex items-center gap-3 text-sm font-semibold tabular-nums text-amber-900/70 short:flex-col short:gap-1">
                <span className="short:hidden">{formatTime(audio.currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={audio.duration || 0}
                  step={0.1}
                  value={audio.currentTime}
                  onChange={(event) => audio.seek(Number(event.target.value))}
                  aria-label="Posición del audio"
                  className="w-full flex-1 accent-amber-600"
                />
                <span>{formatTime(audio.duration)}</span>
              </div>
            ) : (
              <div className="h-2.5 overflow-hidden rounded-full bg-amber-900/10">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            )}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleTogglePlayback}
                disabled={!audio.isReady}
                aria-label={playLabel}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-rose-500 text-white shadow-xl shadow-rose-500/30 transition active:scale-90 disabled:opacity-50 sm:h-28 sm:w-28 short:h-24 short:w-24"
              >
                {audio.isPlaying ? (
                  <PauseIcon className="h-12 w-12" />
                ) : audio.hasEnded ? (
                  <ReplayIcon className="h-11 w-11" />
                ) : (
                  <PlayIcon className="ml-1.5 h-12 w-12" />
                )}
              </button>
            </div>

            {isAdminMode ? (
              <p className="text-center text-xs text-amber-900/60 short:hidden">
                {story.listen_count} {story.listen_count === 1 ? 'escucha' : 'escuchas'} en este dispositivo
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
