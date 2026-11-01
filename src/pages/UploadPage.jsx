import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createStory } from '../lib/storyApi.js'
import { useAdminMode } from '../contexts/useAdminMode.js'
import { splitStoryIntoSentences } from '../utils/sentenceSplit.js'

const emptyForm = {
  title: '',
  storyText: '',
  audioFile: null,
  coverImageFile: null,
}

export function UploadPage() {
  const navigate = useNavigate()
  const { isAdminMode } = useAdminMode()
  const [formData, setFormData] = useState(emptyForm)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sentencePreview = useMemo(
    () => splitStoryIntoSentences(formData.storyText),
    [formData.storyText],
  )

  if (!isAdminMode) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Esta sección es solo para administración
        </h2>
        <p className="mt-3 text-sm text-slate-600 sm:text-base">
          Activa el modo admin para subir cuentos nuevos y configurar la biblioteca.
        </p>
      </section>
    )
  }

  function handleTextChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  function handleAudioChange(event) {
    const [audioFile] = event.target.files ?? []
    setFormData((current) => ({ ...current, audioFile: audioFile ?? null }))
  }

  function handleCoverImageChange(event) {
    const [coverImageFile] = event.target.files ?? []
    setFormData((current) => ({
      ...current,
      coverImageFile: coverImageFile ?? null,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    if (!formData.title.trim()) {
      setErrorMessage('Agrega un título antes de subir el cuento.')
      return
    }

    if (!formData.audioFile) {
      setErrorMessage('Elige un archivo de audio para continuar.')
      return
    }

    if (sentencePreview.length === 0) {
      setErrorMessage('Pega el texto del cuento para separarlo en frases.')
      return
    }

    setIsSubmitting(true)

    try {
      const story = await createStory({
        title: formData.title.trim(),
        audioFile: formData.audioFile,
        coverImageFile: formData.coverImageFile,
        sentences: sentencePreview,
      })

      setFormData(emptyForm)
      navigate(`/editor/${story.id}`)
    } catch (error) {
      setErrorMessage(error.message || 'Ocurrió un problema al guardar el cuento.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,24rem)]">
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Crear un nuevo cuento</h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Agrega un título, elige el audio y pega el cuento completo. La app
            separará el texto en frases para sincronizarlo en la siguiente pantalla.
            Todo se guarda en este dispositivo hasta que descargues el archivo
            .cuento desde el editor.
          </p>
        </div>

        {errorMessage ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Título del cuento</span>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleTextChange}
              placeholder="El dragón muy dormilón"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Archivo de audio</span>
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              className="block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-violet-700"
            />
            <p className="text-xs text-slate-500">
              Usa una sola pista de audio para todo el cuento.
            </p>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              Imagen de portada
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverImageChange}
              className="block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-sky-700"
            />
            <p className="text-xs text-slate-500">
              Opcional. La portada aparecerá en la biblioteca y en el reproductor.
            </p>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Texto del cuento</span>
            <textarea
              name="storyText"
              value={formData.storyText}
              onChange={handleTextChange}
              rows={12}
              placeholder="Había una vez un dragón que bostezó. Buscó una cueva cómoda. Luego encontró la almohada perfecta."
              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
            <p className="text-xs text-slate-500">
              Las frases se separan con una expresión regular simple basada en puntuación.
            </p>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-4 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
          >
            {isSubmitting ? 'Guardando cuento...' : 'Crear cuento y continuar'}
          </button>
        </form>
      </section>

      <aside className="rounded-3xl bg-slate-900 p-5 text-white shadow-sm sm:p-6">
        <h2 className="text-xl font-semibold tracking-tight">Vista previa de frases</h2>
        <p className="mt-2 text-sm text-slate-300">
          Esta es la lista de segmentos que tendrá el cuento.
        </p>

        <div className="mt-6 rounded-3xl bg-white/8 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Segmentos</span>
            <span className="rounded-full bg-white/10 px-3 py-1 font-medium text-white">
              {sentencePreview.length}
            </span>
          </div>

          <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {sentencePreview.length > 0 ? (
              sentencePreview.map((sentence, index) => (
                <div
                  key={`${index}-${sentence}`}
                  className="rounded-2xl border border-white/10 bg-white/6 p-3"
                >
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
                    Segmento {index + 1}
                  </p>
                  <p className="text-sm leading-6 text-slate-100">{sentence}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-slate-300">
                Pega el texto del cuento para ver las frases generadas.
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
