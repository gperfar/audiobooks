import { useEffect, useRef, useState } from 'react'
import { useAdminMode } from '../contexts/useAdminMode.js'
import { LockIcon } from './Icons.jsx'

const HOLD_DURATION_MS = 2000

// A discreet button that only enters admin mode after a sustained press, so a
// toddler tapping around the screen doesn't end up in the editor.
export function AdminGate() {
  const { setAdminMode } = useAdminMode()
  const timeoutRef = useRef(null)
  const [isHolding, setIsHolding] = useState(false)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  function startHold(event) {
    event.preventDefault()
    setIsHolding(true)
    setShowHint(false)
    timeoutRef.current = setTimeout(() => {
      setIsHolding(false)
      setAdminMode(true)
    }, HOLD_DURATION_MS)
  }

  function cancelHold() {
    if (!timeoutRef.current) {
      return
    }

    clearTimeout(timeoutRef.current)
    timeoutRef.current = null

    if (isHolding) {
      setIsHolding(false)
      setShowHint(true)
    }
  }

  return (
    <div className="relative flex items-center">
      {showHint ? (
        <span className="absolute right-12 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
          Mantené apretado para crear cuentos
        </span>
      ) : null}
      <button
        type="button"
        aria-label="Mantené apretado para entrar al modo para crear cuentos"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.repeat) {
            setAdminMode(true)
          }
        }}
        className="relative flex h-10 w-10 touch-none select-none items-center justify-center rounded-full text-amber-900/30 transition hover:text-amber-900/60"
      >
        <svg viewBox="0 0 40 40" className="absolute inset-0 h-10 w-10 -rotate-90" aria-hidden="true">
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="113.1"
            strokeDashoffset={isHolding ? 0 : 113.1}
            className={[
              'text-amber-500',
              isHolding
                ? 'transition-[stroke-dashoffset] duration-[2000ms] ease-linear'
                : 'transition-none',
            ].join(' ')}
          />
        </svg>
        <LockIcon className="h-5 w-5" />
      </button>
    </div>
  )
}
