import { useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAdminMode } from '../contexts/useAdminMode.js'
import { AdminGate } from './AdminGate.jsx'
import { PlusIcon } from './Icons.jsx'

const adminNavLinkClassName = ({ isActive }) =>
  [
    'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition',
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ')

function AdminBar() {
  const { setAdminMode } = useAdminMode()

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <Link to="/" className="flex items-center gap-2 py-1">
          <img src="icon.svg" alt="" className="h-8 w-8" />
          <span className="font-extrabold tracking-tight text-slate-900">
            Cuentos de Aurora
          </span>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
            Admin
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={adminNavLinkClassName}>
            Cuentos
          </NavLink>
          <NavLink to="/upload" className={adminNavLinkClassName}>
            <PlusIcon className="h-4 w-4" />
            Nuevo
          </NavLink>
          <button
            type="button"
            onClick={() => setAdminMode(false)}
            className="ml-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
          >
            Modo Aurora
          </button>
        </nav>
      </div>
    </header>
  )
}

export function AppShell({ children }) {
  const location = useLocation()
  const { isAdminMode } = useAdminMode()
  const isPlayerRoute = location.pathname.startsWith('/player/')

  useEffect(() => {
    document.title = 'Cuentos de Aurora'
  }, [])

  if (isAdminMode) {
    return (
      <div className="min-h-dvh bg-slate-50 text-slate-900">
        <AdminBar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">{children}</main>
      </div>
    )
  }

  // Aurora mode: the player owns the whole screen; the library gets a small,
  // friendly header with the hidden admin entrance.
  if (isPlayerRoute) {
    return <div className="min-h-dvh bg-amber-50 text-slate-900">{children}</div>
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,_#fff7ed,_#fef3c7_60%,_#fde68a)] text-slate-900">
      <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          <h1 className="story-text text-3xl font-bold tracking-tight text-amber-950 sm:text-4xl">
            Cuentos de Aurora
          </h1>
          <AdminGate />
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}
