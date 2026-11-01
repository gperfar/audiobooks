import { useState } from 'react'

const fallbackPalettes = [
  'from-rose-300 to-orange-200 text-rose-900',
  'from-sky-300 to-indigo-200 text-indigo-900',
  'from-emerald-300 to-lime-200 text-emerald-900',
  'from-amber-300 to-yellow-200 text-amber-900',
  'from-violet-300 to-fuchsia-200 text-violet-900',
  'from-teal-300 to-cyan-200 text-teal-900',
]

function pickPalette(seed = '') {
  let hash = 0

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }

  return fallbackPalettes[hash % fallbackPalettes.length]
}

// Without an image, show a colorful cover with the title's first letter,
// which doubles as a letter to recognize.
export function StoryCover({ src, title, seed, className = '' }) {
  const [failedSrc, setFailedSrc] = useState(null)

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={title ? `Portada de ${title}` : 'Portada del cuento'}
        onError={() => setFailedSrc(src)}
        className={['bg-slate-100 object-cover', className].join(' ')}
      />
    )
  }

  const initial = title?.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      role="img"
      aria-label={title ? `Portada de ${title}` : 'Portada del cuento'}
      className={[
        'story-text flex items-center justify-center bg-gradient-to-br font-bold [container-type:inline-size]',
        pickPalette(seed ?? title),
        className,
      ].join(' ')}
    >
      <span className="text-[clamp(2.5rem,40cqw,7rem)] leading-none">{initial}</span>
    </div>
  )
}
