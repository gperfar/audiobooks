import { useState } from 'react'

export function StoryCover({
  src,
  title,
  className = '',
  imageClassName = '',
  fallbackClassName = '',
}) {
  const [hasImageError, setHasImageError] = useState(false)
  const shouldShowImage = Boolean(src && !hasImageError)

  if (shouldShowImage) {
    return (
      <img
        src={src}
        alt={title ? `Portada de ${title}` : 'Portada del cuento'}
        onError={() => setHasImageError(true)}
        className={['bg-slate-100 object-cover', className, imageClassName].join(' ')}
      />
    )
  }

  return (
    <div
      className={[
        'flex items-center justify-center bg-gradient-to-br from-violet-100 via-sky-50 to-amber-50 text-center text-slate-500',
        className,
        fallbackClassName,
      ].join(' ')}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
          Portada
        </p>
        <p className="mt-2 text-sm font-medium text-slate-600">Sin imagen</p>
      </div>
    </div>
  )
}
