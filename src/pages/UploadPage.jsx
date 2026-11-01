import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImageIcon, MusicIcon } from '../components/Icons.jsx'
import { createStory } from '../lib/storyApi.js'
import { splitStoryIntoSentences } from '../utils/sentenceSplit.js'

const emptyForm = {
  title: '',
  narrator: '',
  storyText: '',
  audioFile: null,
  coverImageFile: null,
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100'

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
    </label>
  )
}

// Styled replacement for the native file input, whose label can't be translated.
function FilePicker({ accept, file, onChange, icon, emptyLabel, preview }) {
  return (
    <span className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-3 transition hover:border-violet-400 hover:bg-violet-50/40">
      {preview ?? (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-slate-800">
          {file ? file.name : emptyLabel}
        </span>
        <span className="block text-xs text-slate-500">
          {file ? 'Tocá para cambiarlo' : 'Tocá para elegir'}
        </span>
      </span>
      <input
        type="file"
        accept={accept}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="sr-only"
      />
    </span>
  )
}

function useObjectUrl(file) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => () => url && URL.revokeObjectURL(url), [url])

  return url
}

export function UploadPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(emptyForm)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const coverPreviewUrl = useObjectUrl(formData.coverImageFile)

  const sentences = useMemo(
    () => splitStoryIntoSentences(formData.storyText),
    [formData.storyText],
  )

  function updateField(name, value) {
    setFormData((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    if (!formData.title.trim()) {
      setErrorMessage('Falta el título del cuento.')
      return
    }

    if (!formData.audioFile) {
      setErrorMessage('Falta elegir el audio.')
      return
    }

    if (sentences.length === 0) {
      setErrorMessage('Falta pegar el texto del cuento.')
      return
    }

    setIsSubmitting(true)

    try {
      const story = await createStory({
        title: formData.title.trim(),
        narrator: formData.narrator.trim(),
        audioFile: formData.audioFile,
        coverImageFile: formData.coverImageFile,
        sentences,
      })

      navigate(`/editor/${story.id}`)
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo guardar el cuento.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Nuevo cuento</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cargá el audio y el texto. En el paso siguiente marcás cuándo empieza
          cada frase.
        </p>
      </div>

      <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <Field label="Título">
          <input
            type="text"
            value={formData.title}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="El dragón dormilón"
            className={inputClassName}
          />
        </Field>

        <Field label="¿Quién lo lee?" hint="Opcional. Aurora lo ve como “Leído por…”.">
          <input
            type="text"
            value={formData.narrator}
            onChange={(event) => updateField('narrator', event.target.value)}
            placeholder="la abuela, el tío Juan, mamá..."
            className={inputClassName}
          />
        </Field>

        <Field label="Audio">
          <FilePicker
            accept="audio/*"
            file={formData.audioFile}
            onChange={(file) => updateField('audioFile', file)}
            icon={<MusicIcon className="h-6 w-6" />}
            emptyLabel="Elegir el audio del cuento"
          />
        </Field>

        <Field label="Portada" hint="Opcional. Si no hay, se usa una de color con la primera letra.">
          <FilePicker
            accept="image/*"
            file={formData.coverImageFile}
            onChange={(file) => updateField('coverImageFile', file)}
            icon={<ImageIcon className="h-6 w-6" />}
            emptyLabel="Elegir una imagen"
            preview={
              coverPreviewUrl ? (
                <img src={coverPreviewUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              ) : null
            }
          />
        </Field>

        <Field
          label="Texto"
          hint="Se separa en frases por los puntos y los signos de pregunta y exclamación."
        >
          <textarea
            value={formData.storyText}
            onChange={(event) => updateField('storyText', event.target.value)}
            rows={10}
            placeholder="Había una vez un dragón que bostezó. Buscó una cueva cómoda..."
            className={`${inputClassName} story-text leading-relaxed`}
          />
        </Field>

        {sentences.length > 0 ? (
          <details className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <summary className="cursor-pointer text-sm font-bold text-slate-700">
              {sentences.length} {sentences.length === 1 ? 'frase' : 'frases'} — ver cómo quedan
            </summary>
            <ol className="story-text mt-3 list-decimal space-y-1.5 pl-6 text-slate-700">
              {sentences.map((sentence, index) => (
                <li key={`${index}-${sentence}`}>{sentence}</li>
              ))}
            </ol>
          </details>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-violet-600 px-5 py-4 text-base font-bold text-white transition hover:bg-violet-700 disabled:bg-violet-300"
      >
        {isSubmitting ? 'Guardando...' : 'Guardar y marcar tiempos'}
      </button>
    </form>
  )
}
