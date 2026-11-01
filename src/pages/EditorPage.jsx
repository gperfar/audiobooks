import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  BackIcon,
  CheckIcon,
  MusicIcon,
  NextIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
} from '../components/Icons.jsx'
import { PublishPanel } from '../components/PublishPanel.jsx'
import { StoryCover } from '../components/StoryCover.jsx'
import { useStoryAudio } from '../hooks/useStoryAudio.js'
import {
  deleteStory,
  fetchStoryWithSegments,
  saveSegmentsTiming,
  updateSegmentText,
  updateStoryAudio,
  updateStoryCoverImage,
  updateStoryDetails,
} from '../lib/storyApi.js'
import {
  findActiveSegment,
  getNextSegmentIndex,
  updateSegmentTiming,
} from '../utils/editorTiming.js'
import { formatPreciseTime, formatTime } from '../utils/formatTime.js'

const REWIND_SECONDS = 3

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100'

function isTypingTarget(element) {
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName)
}

// Debounced autosave: call schedule(value) on every change; the latest value
// is saved after `delay` ms without changes.
function useAutosave(save, delay) {
  const timeoutRef = useRef(null)
  const latestValueRef = useRef(null)
  const saveRef = useRef(save)

  useEffect(() => {
    saveRef.current = save
  }, [save])

  const flush = useCallback(() => {
    if (!timeoutRef.current) {
      return
    }

    clearTimeout(timeoutRef.current)
    timeoutRef.current = null
    saveRef.current(latestValueRef.current)
  }, [])

  const schedule = useCallback(
    (value) => {
      latestValueRef.current = value
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        saveRef.current(latestValueRef.current)
      }, delay)
    },
    [delay],
  )

  // Save pending changes when leaving the page.
  useEffect(() => flush, [flush])

  return schedule
}

// Mounted fresh each time editing starts, so drafts start from current values.
function SentenceEditor({ segment, index, onSave, onCancel, rowRef }) {
  const [textDraft, setTextDraft] = useState(segment.text)
  const [timeDraft, setTimeDraft] = useState(segment.start_time ?? '')

  return (
      <li ref={rowRef} className="scroll-mt-24 scroll-mb-48 rounded-2xl bg-white p-4 shadow-sm ring-2 ring-violet-300">
        <p className="mb-2 text-xs font-bold text-violet-700">Frase {index + 1}</p>
        <textarea
          value={textDraft}
          onChange={(event) => setTextDraft(event.target.value)}
          rows={3}
          className={`${inputClassName} story-text text-lg`}
        />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Empieza en (segundos)</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={timeDraft}
              onChange={(event) => setTimeDraft(event.target.value)}
              className={`${inputClassName} mt-1 w-32`}
            />
          </label>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() =>
                onSave({
                  text: textDraft.trim(),
                  startTime: timeDraft === '' ? null : Number(timeDraft),
                })
              }
              disabled={!textDraft.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-300"
            >
              <CheckIcon className="h-4 w-4" />
              Listo
            </button>
          </div>
        </div>
      </li>
  )
}

function SentenceRow({
  segment,
  index,
  isActive,
  isNext,
  isEditing,
  onSeek,
  onStartEditing,
  onSave,
  onCancel,
  rowRef,
}) {
  const isMarked = typeof segment.start_time === 'number'

  if (isEditing) {
    return (
      <SentenceEditor
        segment={segment}
        index={index}
        onSave={onSave}
        onCancel={onCancel}
        rowRef={rowRef}
      />
    )
  }

  return (
    <li
      ref={rowRef}
      className={[
        'flex scroll-mt-24 scroll-mb-48 items-start gap-3 rounded-2xl p-3 transition',
        isActive
          ? 'bg-violet-100 ring-2 ring-violet-300'
          : isNext
            ? 'bg-white outline-2 outline-dashed outline-amber-400'
            : 'bg-white ring-1 ring-slate-200',
      ].join(' ')}
    >
      <span
        className={[
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          isMarked ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500',
        ].join(' ')}
      >
        {index + 1}
      </span>

      <button
        type="button"
        onClick={onSeek}
        disabled={!isMarked}
        title={isMarked ? 'Escuchar desde esta frase' : undefined}
        className="min-w-0 flex-1 text-left disabled:cursor-default"
      >
        <span className="story-text block text-lg leading-snug text-slate-900">{segment.text}</span>
        <span className="mt-1 block text-xs font-semibold tabular-nums text-slate-500">
          {isMarked ? (
            formatPreciseTime(segment.start_time)
          ) : isNext ? (
            <span className="text-amber-700">Sigue esta</span>
          ) : (
            'Sin marcar'
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={onStartEditing}
        aria-label={`Editar frase ${index + 1}`}
        className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <PencilIcon className="h-4 w-4" />
      </button>
    </li>
  )
}

export function EditorPage() {
  const { storyId } = useParams()
  const navigate = useNavigate()
  const rowRefs = useRef({})

  const [story, setStory] = useState(null)
  const [segments, setSegments] = useState([])
  const [titleDraft, setTitleDraft] = useState('')
  const [narratorDraft, setNarratorDraft] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [pendingSaves, setPendingSaves] = useState(0)
  const [editingIndex, setEditingIndex] = useState(null)
  const [lockedNextIndex, setLockedNextIndex] = useState(null)
  const [audioNotice, setAudioNotice] = useState('')

  useEffect(() => {
    let isMounted = true

    fetchStoryWithSegments(storyId)
      .then((data) => {
        if (!isMounted) {
          return
        }

        setStory(data)
        setSegments(data.segments)
        setTitleDraft(data.title ?? '')
        setNarratorDraft(data.narrator ?? '')
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

  const audio = useStoryAudio(story?.audio_url)

  // --- Saving -----------------------------------------------------------------

  const runSave = useCallback(async (save) => {
    setPendingSaves((count) => count + 1)
    setErrorMessage('')

    try {
      await save()
      setStory((currentStory) => ({ ...currentStory, isLocal: true }))
    } catch (error) {
      setErrorMessage(error.message || 'No se pudieron guardar los cambios.')
    } finally {
      setPendingSaves((count) => count - 1)
    }
  }, [])

  const scheduleTimingSave = useAutosave(
    useCallback(
      (nextSegments) => runSave(() => saveSegmentsTiming(storyId, nextSegments)),
      [runSave, storyId],
    ),
    400,
  )

  const scheduleDetailsSave = useAutosave(
    useCallback(
      (details) => {
        if (details.title) {
          runSave(() => updateStoryDetails(storyId, details))
        }
      },
      [runSave, storyId],
    ),
    700,
  )

  function changeSegments(updater) {
    setSegments((currentSegments) => {
      const nextSegments = updater(currentSegments)
      scheduleTimingSave(nextSegments)
      return nextSegments
    })
  }

  // --- Syncing ----------------------------------------------------------------

  const activeSegment = findActiveSegment(segments, audio.currentTime)
  const nextIndex = getNextSegmentIndex(segments, audio.currentTime, lockedNextIndex)
  const nextSegment = segments[nextIndex] ?? null
  const markedCount = segments.filter((segment) => typeof segment.start_time === 'number').length

  const markNextSegment = useCallback(() => {
    const time = Math.round(audio.getTime() * 100) / 100

    setLockedNextIndex(null)
    setSegments((currentSegments) => {
      const index = getNextSegmentIndex(currentSegments, time, lockedNextIndex)

      if (index >= currentSegments.length) {
        return currentSegments
      }

      const nextSegments = updateSegmentTiming(currentSegments, index, time)
      scheduleTimingSave(nextSegments)
      return nextSegments
    })
  }, [audio, lockedNextIndex, scheduleTimingSave])

  // Seeking back (to fix a mark) keeps the button on the sentence that comes
  // next from the new position.
  const seekTo = useCallback(
    (time) => {
      audio.seek(time)
      setLockedNextIndex(getNextSegmentIndex(segments, time))
    },
    [audio, segments],
  )

  const rewind = useCallback(() => {
    seekTo(Math.max(audio.getTime() - REWIND_SECONDS, 0))
  }, [audio, seekTo])

  useEffect(() => {
    function handleKeyDown(event) {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()
        audio.toggle()
      } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault()
        markNextSegment()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        rewind()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [audio, markNextSegment, rewind])

  // Follow the audio through the list while playing.
  useEffect(() => {
    if (audio.isPlaying && activeSegment) {
      rowRefs.current[activeSegment.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeSegment, audio.isPlaying])

  // --- Other edits --------------------------------------------------------------

  function handleDetailsChange(nextTitle, nextNarrator) {
    setTitleDraft(nextTitle)
    setNarratorDraft(nextNarrator)
    scheduleDetailsSave({ title: nextTitle.trim(), narrator: nextNarrator.trim() })
  }

  function handleCoverChange(event) {
    const [file] = event.target.files ?? []
    event.target.value = ''

    if (file) {
      runSave(async () => {
        const updatedStory = await updateStoryCoverImage(storyId, file)
        setStory((currentStory) => ({ ...currentStory, ...updatedStory }))
      })
    }
  }

  function handleAudioChange(event) {
    const [file] = event.target.files ?? []
    event.target.value = ''

    if (!file) {
      return
    }

    audio.pause()
    runSave(async () => {
      const updatedStory = await updateStoryAudio(storyId, file)
      setStory((currentStory) => ({ ...currentStory, ...updatedStory }))
      setAudioNotice(
        markedCount > 0
          ? 'Audio cambiado. Si es otra grabación, los tiempos marcados ya no van a coincidir: revisalos o borralos y marcalos de nuevo.'
          : 'Audio cambiado.',
      )
    })
  }

  function handleClearTimings() {
    const confirmed = window.confirm(
      '¿Borrar todos los tiempos marcados? Vas a tener que marcar todas las frases de nuevo.',
    )

    if (!confirmed) {
      return
    }

    audio.pause()
    audio.seek(0)
    setLockedNextIndex(null)
    setAudioNotice('')
    changeSegments((currentSegments) =>
      currentSegments.map((segment) => ({ ...segment, start_time: null, end_time: null })),
    )
  }

  function handleSegmentSave(index, { text, startTime }) {
    const segment = segments[index]
    setEditingIndex(null)

    if (text !== segment.text) {
      setSegments((currentSegments) =>
        currentSegments.map((current, currentIndex) =>
          currentIndex === index ? { ...current, text } : current,
        ),
      )
      runSave(() => updateSegmentText(storyId, segment.id, text))
    }

    if (startTime !== segment.start_time && !Number.isNaN(startTime)) {
      changeSegments((currentSegments) =>
        startTime === null
          ? currentSegments.map((current, currentIndex) =>
              currentIndex === index ? { ...current, start_time: null } : current,
            )
          : updateSegmentTiming(currentSegments, index, startTime),
      )
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      story.isInCatalog
        ? '¿Descartar los cambios hechos en este dispositivo? Vas a volver a la versión publicada.'
        : '¿Borrar este cuento? Si no lo descargaste como .cuento, no se puede recuperar.',
    )

    if (!confirmed) {
      return
    }

    try {
      await deleteStory(storyId)
      navigate('/')
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo borrar el cuento.')
    }
  }

  const progressPercent = useMemo(
    () => (segments.length > 0 ? Math.round((markedCount / segments.length) * 100) : 0),
    [markedCount, segments.length],
  )

  if (isLoading) {
    return <p className="py-16 text-center text-slate-500">Abriendo el cuento...</p>
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {loadError}
      </div>
    )
  }

  return (
    <div className="pb-44">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to="/" className="text-sm font-semibold text-slate-500 hover:text-slate-800">
            ← Cuentos
          </Link>
          <h2 className="truncate text-2xl font-extrabold tracking-tight">
            {titleDraft || 'Sin título'}
          </h2>
        </div>
        <span
          className={[
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
            errorMessage
              ? 'bg-rose-100 text-rose-700'
              : pendingSaves > 0
                ? 'bg-slate-100 text-slate-500'
                : 'bg-emerald-100 text-emerald-700',
          ].join(' ')}
        >
          {errorMessage ? (
            'Error al guardar'
          ) : pendingSaves > 0 ? (
            'Guardando...'
          ) : (
            <>
              <CheckIcon className="h-3.5 w-3.5" />
              Guardado
            </>
          )}
        </span>
      </div>

      {errorMessage ? (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section className="order-1 space-y-3 lg:order-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold">Marcar tiempos</h3>
              <span className="text-sm font-semibold tabular-nums text-slate-500">
                {markedCount} de {segments.length}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Dale play y tocá <strong>Siguiente frase</strong> justo cuando empieza
              cada una. Si te pasaste, volvé {REWIND_SECONDS} segundos y tocá de nuevo.
              Tocando una frase marcada la escuchás desde ahí.
            </p>
            <p className="mt-2 hidden text-xs text-slate-400 sm:block">
              Teclado: espacio = play/pausa · → o Enter = siguiente frase · ← = volver {REWIND_SECONDS} s
            </p>
            {audioNotice ? (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                {audioNotice}
              </p>
            ) : null}
            {markedCount > 0 ? (
              <button
                type="button"
                onClick={handleClearTimings}
                className="mt-3 text-sm font-semibold text-rose-600 hover:text-rose-800"
              >
                Borrar todos los tiempos
              </button>
            ) : null}
          </div>

          <ol className="space-y-2">
            {segments.map((segment, index) => (
              <SentenceRow
                key={segment.id}
                segment={segment}
                index={index}
                isActive={activeSegment?.id === segment.id}
                isNext={index === nextIndex}
                isEditing={editingIndex === index}
                onSeek={() => {
                  seekTo(segment.start_time)
                  audio.play()
                }}
                onStartEditing={() => setEditingIndex(index)}
                onSave={(changes) => handleSegmentSave(index, changes)}
                onCancel={() => setEditingIndex(null)}
                rowRef={(element) => {
                  rowRefs.current[segment.id] = element
                }}
              />
            ))}
          </ol>
        </section>

        <aside className="order-2 space-y-4 lg:sticky lg:top-20 lg:order-1 lg:self-start">
          <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h3 className="font-bold">Datos del cuento</h3>
            <label className="flex cursor-pointer items-center gap-3">
              <StoryCover
                src={story.cover_image_url}
                title={titleDraft}
                seed={story.id}
                className="h-20 w-20 shrink-0 rounded-xl"
              />
              <span className="text-sm font-semibold text-violet-700">
                {story.cover_image_url ? 'Cambiar portada' : 'Agregar portada'}
              </span>
              <input type="file" accept="image/*" onChange={handleCoverChange} className="sr-only" />
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 transition hover:ring-violet-300">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                <MusicIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-800">
                  Audio · {formatTime(audio.duration)}
                </span>
                <span className="block text-sm font-semibold text-violet-700">Cambiar audio</span>
              </span>
              <input type="file" accept="audio/*" onChange={handleAudioChange} className="sr-only" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-500">Título</span>
              <input
                type="text"
                value={titleDraft}
                onChange={(event) => handleDetailsChange(event.target.value, narratorDraft)}
                className={inputClassName}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-500">Leído por</span>
              <input
                type="text"
                value={narratorDraft}
                onChange={(event) => handleDetailsChange(titleDraft, event.target.value)}
                placeholder="la abuela, el tío Juan..."
                className={inputClassName}
              />
            </label>
          </div>

          <PublishPanel
            story={story}
            missingCount={segments.length - markedCount}
            onDelete={handleDelete}
          />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto max-w-6xl space-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 text-xs font-semibold tabular-nums text-slate-500">
            <span>{formatTime(audio.currentTime)}</span>
            <input
              type="range"
              min={0}
              max={audio.duration || 0}
              step={0.1}
              value={audio.currentTime}
              onChange={(event) => seekTo(Number(event.target.value))}
              aria-label="Posición del audio"
              className="flex-1 accent-violet-600"
            />
            <span>{formatTime(audio.duration)}</span>
          </div>

          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={rewind}
              aria-label={`Volver ${REWIND_SECONDS} segundos`}
              className="flex w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition active:scale-95"
            >
              <BackIcon className="h-5 w-5" />
              <span className="text-[0.65rem] font-bold">{REWIND_SECONDS} s</span>
            </button>
            <button
              type="button"
              onClick={audio.toggle}
              disabled={!audio.isReady}
              aria-label={audio.isPlaying ? 'Pausar' : 'Reproducir'}
              className="flex w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white transition active:scale-95 disabled:opacity-50"
            >
              {audio.isPlaying ? <PauseIcon className="h-7 w-7" /> : <PlayIcon className="ml-0.5 h-7 w-7" />}
            </button>
            <button
              type="button"
              onClick={markNextSegment}
              disabled={!nextSegment || !audio.isReady}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-violet-600 px-4 py-3 text-left text-white transition active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-500"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-base font-extrabold">
                  {nextSegment ? `Siguiente frase (${nextIndex + 1})` : 'Todas marcadas'}
                </span>
                {nextSegment ? (
                  <span className="story-text block truncate text-sm opacity-80">
                    {nextSegment.text}
                  </span>
                ) : null}
              </span>
              <NextIcon className="h-6 w-6 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
