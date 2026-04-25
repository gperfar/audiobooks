import { useEffect, useMemo, useRef, useState } from 'react'
import { Howl } from 'howler'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StoryCover } from '../components/StoryCover.jsx'
import { useAdminMode } from '../contexts/useAdminMode.js'
import {
  deleteStory,
  fetchStoryWithSegments,
  saveSegmentsTiming,
  updateSegmentText,
  updateStoryCoverImage,
  updateStoryTitle,
  uploadCoverImage,
} from '../lib/storyApi.js'
import {
  findActiveSegment,
  updateSegmentTiming,
} from '../utils/editorTiming.js'

function formatTime(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--:--'
  }

  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function EditorPage() {
  const { storyId } = useParams()
  const navigate = useNavigate()
  const { isAdminMode } = useAdminMode()
  const soundRef = useRef(null)
  const animationFrameRef = useRef(null)
  const segmentRefs = useRef({})

  const [story, setStory] = useState(null)
  const [segments, setSegments] = useState([])
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingCover, setIsSavingCover] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [selectedSegmentId, setSelectedSegmentId] = useState(null)
  const [coverImageFile, setCoverImageFile] = useState(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const [isDeletingStory, setIsDeletingStory] = useState(false)
  const [editingSegmentId, setEditingSegmentId] = useState(null)

  const activeSegment = useMemo(
    () => findActiveSegment(segments, currentTime),
    [segments, currentTime],
  )

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
        setTitleDraft(data.title ?? '')
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || 'No se pudo cargar el editor del cuento.')
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

    const sound = new Howl({
      src: [story.audio_url],
      html5: true,
      onplay: () => {
        setIsPlaying(true)
      },
      onpause: () => {
        setIsPlaying(false)
      },
      onstop: () => {
        setIsPlaying(false)
      },
      onend: () => {
        setIsPlaying(false)
      },
    })

    soundRef.current = sound

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      sound.unload()
      soundRef.current = null
    }
  }, [story?.audio_url])

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
    if (!activeSegment?.id) {
      return
    }

    const element = segmentRefs.current[activeSegment.id]
    element?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }, [activeSegment?.id])

  function togglePlayback() {
    const sound = soundRef.current

    if (!sound) {
      return
    }

    setSaveMessage('')

    if (sound.playing()) {
      sound.pause()
      setCurrentTime(Number(sound.seek() || 0))
      return
    }

    sound.play()
  }

  function handleSegmentClick(index) {
    const sound = soundRef.current
    const clickedSegment = segments[index]

    if (!clickedSegment) {
      return
    }

    setSelectedSegmentId(clickedSegment.id)
    setSaveMessage('')

    if (!sound?.playing()) {
      return
    }

    const time = Number(sound.seek() || 0)

    // Keep the timing update intentionally simple: assign the clicked sentence
    // start and close the previous sentence at the same playback time.
    setSegments((currentSegments) => updateSegmentTiming(currentSegments, index, time))
    setCurrentTime(time)
  }

  function handleManualStartTimeChange(index, value) {
    const parsedValue = value === '' ? null : Number(value)

    if (parsedValue !== null && Number.isNaN(parsedValue)) {
      return
    }

    setSaveMessage('')
    setSegments((currentSegments) => {
      if (parsedValue === null) {
        return currentSegments.map((segment, currentIndex) => {
          if (currentIndex === index) {
            return { ...segment, start_time: null }
          }

          return segment
        })
      }

      return updateSegmentTiming(currentSegments, index, parsedValue)
    })
  }

  function handleCoverImageChange(event) {
    const [file] = event.target.files ?? []
    setCoverImageFile(file ?? null)
    setErrorMessage('')
    setSaveMessage('')
  }

  async function handleTitleSave() {
    const trimmedTitle = titleDraft.trim()

    if (!trimmedTitle || !storyId) {
      setErrorMessage('Agrega un título válido antes de guardar.')
      return
    }

    setIsSavingTitle(true)
    setErrorMessage('')
    setSaveMessage('')

    try {
      const updatedStory = await updateStoryTitle(storyId, trimmedTitle)
      setStory((currentStory) => ({
        ...currentStory,
        ...updatedStory,
        segments: currentStory?.segments ?? [],
      }))
      setTitleDraft(updatedStory.title)
      setSaveMessage('Título actualizado.')
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo actualizar el título.')
    } finally {
      setIsSavingTitle(false)
    }
  }

  async function handleDeleteStory() {
    if (!storyId) {
      return
    }

    const confirmed = window.confirm(
      '¿Seguro que quieres borrar este cuento? Esta acción no se puede deshacer.',
    )

    if (!confirmed) {
      return
    }

    setIsDeletingStory(true)
    setErrorMessage('')
    setSaveMessage('')

    try {
      await deleteStory(storyId)
      navigate('/')
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo borrar el cuento.')
    } finally {
      setIsDeletingStory(false)
    }
  }

  function handleSegmentTextChange(index, value) {
    setSegments((currentSegments) =>
      currentSegments.map((segment, currentIndex) =>
        currentIndex === index ? { ...segment, text: value } : segment,
      ),
    )
  }

  async function handleSegmentTextSave(segmentId, text) {
    const trimmedText = text.trim()

    if (!trimmedText) {
      setErrorMessage('El texto de la frase no puede quedar vacío.')
      return
    }

    setErrorMessage('')
    setSaveMessage('')

    try {
      const updatedSegment = await updateSegmentText(segmentId, trimmedText)
      setSegments((currentSegments) =>
        currentSegments.map((segment) =>
          segment.id === segmentId ? { ...segment, ...updatedSegment } : segment,
        ),
      )
      setEditingSegmentId(null)
      setSaveMessage('Texto de la frase actualizado.')
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo actualizar la frase.')
    }
  }

  async function handleCoverImageSave() {
    if (!coverImageFile || !storyId) {
      return
    }

    setIsSavingCover(true)
    setErrorMessage('')
    setSaveMessage('')

    try {
      const coverImageUrl = await uploadCoverImage(coverImageFile)
      const updatedStory = await updateStoryCoverImage(storyId, coverImageUrl)

      setStory((currentStory) => ({
        ...currentStory,
        ...updatedStory,
        segments: currentStory?.segments ?? [],
      }))
      setCoverImageFile(null)
      setSaveMessage('Portada actualizada.')
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo actualizar la portada.')
    } finally {
      setIsSavingCover(false)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    setErrorMessage('')
    setSaveMessage('')

    try {
      await saveSegmentsTiming(segments)
      setSaveMessage('Tiempos guardados.')
    } catch (error) {
      setErrorMessage(error.message || 'No se pudieron guardar los tiempos.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <p className="text-sm text-slate-600">Cargando editor del cuento...</p>
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

  if (!isAdminMode) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          El editor solo está disponible en modo admin
        </h2>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          Activa el modo admin para editar cuentos, frases y configuraciones.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">
          Editor de sincronización
        </p>
        <div className="mt-4 space-y-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Título del cuento</span>
            <input
              type="text"
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleTitleSave}
              disabled={isSavingTitle}
              className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSavingTitle ? 'Guardando título...' : 'Guardar título'}
            </button>
            <button
              type="button"
              onClick={handleDeleteStory}
              disabled={isDeletingStory}
              className="inline-flex rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
            >
              {isDeletingStory ? 'Borrando...' : 'Borrar cuento'}
            </button>
          </div>
        </div>

        <p className="mt-5 text-sm text-slate-600 sm:text-base">
          Reproduce el audio y haz clic en cada frase cuando empiece. La frase
          anterior se cerrará automáticamente en ese mismo instante.
        </p>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
          <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <StoryCover
              src={story?.cover_image_url}
              title={story?.title}
              className="h-56 w-full rounded-3xl"
            />

            <div className="mt-5">
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                Portada del cuento
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Agrega o reemplaza la portada que se usa en la biblioteca y en el reproductor.
              </p>

              <div className="mt-4 space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="block w-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-sky-700"
                />

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleCoverImageSave}
                    disabled={!coverImageFile || isSavingCover}
                    className="inline-flex rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                  >
                    {isSavingCover ? 'Guardando portada...' : 'Guardar portada'}
                  </button>

                  {coverImageFile ? (
                    <span className="inline-flex items-center rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                      {coverImageFile.name}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Tiempo actual</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                  {formatTime(currentTime)}
                </p>
              </div>

              <button
                type="button"
                onClick={togglePlayback}
                className="inline-flex min-w-32 items-center justify-center rounded-2xl bg-slate-900 px-5 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
              >
                {isPlaying ? 'Pausar audio' : 'Reproducir audio'}
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              <p>
                Frase activa:{' '}
                <span className="font-medium text-slate-900">
                  {activeSegment?.text || 'Todavía no hay una frase que coincida con el tiempo actual.'}
                </span>
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
              >
                {isSaving ? 'Guardando...' : 'Guardar tiempos'}
              </button>

              <Link
                to={`/player/${storyId}`}
                className="inline-flex rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Abrir reproductor
              </Link>

              <Link
                to="/"
                className="inline-flex rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Volver a la biblioteca
              </Link>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {saveMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {saveMessage}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-4 px-2">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">
              Frases del cuento
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Haz clic en cada frase mientras suena el audio para asignar su inicio.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
            {segments.length} en total
          </div>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          {segments.map((segment, index) => {
            const isActive = activeSegment?.id === segment.id
            const isSelected = selectedSegmentId === segment.id

            return (
              <button
                key={segment.id}
                type="button"
                onClick={() => handleSegmentClick(index)}
                ref={(element) => {
                  if (element) {
                    segmentRefs.current[segment.id] = element
                  }
                }}
                className={[
                  'block w-full rounded-3xl border p-4 text-left transition',
                  isActive
                    ? 'border-violet-300 bg-violet-50 shadow-sm'
                    : isSelected
                      ? 'border-sky-300 bg-sky-50'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                      Segmento {index + 1}
                    </p>
                    {editingSegmentId === segment.id ? (
                      <div className="mt-2 space-y-3">
                        <textarea
                          value={segment.text}
                          onChange={(event) =>
                            handleSegmentTextChange(index, event.target.value)
                          }
                          rows={3}
                          onClick={(event) => event.stopPropagation()}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base leading-7 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleSegmentTextSave(segment.id, segment.text)
                            }}
                            className="inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            Guardar texto
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setEditingSegmentId(null)
                            }}
                            className="inline-flex rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-3">
                        <p className="text-lg leading-8 text-slate-900">{segment.text}</p>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setEditingSegmentId(segment.id)
                          }}
                          className="inline-flex rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                        >
                          Editar texto
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="min-w-40 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <label className="block">
                      <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                        Inicio
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={segment.start_time ?? ''}
                        onChange={(event) =>
                          handleManualStartTimeChange(index, event.target.value)
                        }
                        onClick={(event) => event.stopPropagation()}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      />
                    </label>
                    <p className="mt-2 text-xs text-slate-500">
                      {typeof segment.start_time === 'number'
                        ? `${segment.start_time.toFixed(2)}s`
                        : 'Sin definir'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    Inicio:{' '}
                    {typeof segment.start_time === 'number'
                      ? `${segment.start_time.toFixed(2)}s`
                      : 'sin definir'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    Fin:{' '}
                    {typeof segment.end_time === 'number'
                      ? `${segment.end_time.toFixed(2)}s`
                      : 'abierto'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
