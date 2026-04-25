import { useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAdminMode } from '../contexts/useAdminMode.js'

const navLinkClassName = ({ isActive }) =>
  [
    'rounded-full px-4 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-slate-900 text-white shadow-sm'
      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900',
  ].join(' ')

function AdminModeToggle({ isAdminMode, toggleAdminMode }) {
  return (
    <button
      type="button"
      onClick={toggleAdminMode}
      aria-pressed={isAdminMode}
      className={[
        'inline-flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium shadow-sm ring-1 transition',
        isAdminMode
          ? 'bg-slate-900 text-white ring-slate-900'
          : 'bg-white text-slate-700 ring-slate-200 hover:text-slate-900',
      ].join(' ')}
    >
      <span>{isAdminMode ? 'Modo admin' : 'Modo lectura'}</span>
      <span
        className={[
          'relative inline-flex h-6 w-11 rounded-full transition',
          isAdminMode ? 'bg-white/25' : 'bg-slate-200',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            isAdminMode ? 'translate-x-5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </span>
    </button>
  )
}

export function AppShell({ children }) {
  const location = useLocation()
  const isPlayerRoute = location.pathname.startsWith('/player/')
  const { isAdminMode, toggleAdminMode } = useAdminMode()

  useEffect(() => {
    document.title = 'Audiolibros de Aurora'
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div
        className={[
          'mx-auto flex min-h-screen w-full flex-col px-4 sm:px-6 lg:px-8',
          isPlayerRoute ? 'max-w-6xl py-3' : 'max-w-5xl py-6',
        ].join(' ')}
      >
        {isPlayerRoute ? (
          <div className="mb-3 flex items-center justify-between">
            <Link
              to="/"
              className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 backdrop-blur transition hover:text-slate-900"
            >
              Audiolibros de Aurora
            </Link>
            <AdminModeToggle
              isAdminMode={isAdminMode}
              toggleAdminMode={toggleAdminMode}
            />
          </div>
        ) : (
          <header className="mb-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">
                  Audiolibros de Aurora
                </p>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Cuentos para leer y escuchar
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                    Sube un cuento, separa el texto por frases y sincronízalo con
                    el audio para acompañar la lectura.
                  </p>
                </div>
              </div>

              <nav className="flex flex-wrap gap-2">
                <NavLink to="/" className={navLinkClassName}>
                  Inicio
                </NavLink>
                {isAdminMode ? (
                  <NavLink to="/upload" className={navLinkClassName}>
                    Subir cuento
                  </NavLink>
                ) : null}
                <AdminModeToggle
                  isAdminMode={isAdminMode}
                  toggleAdminMode={toggleAdminMode}
                />
              </nav>
            </div>
          </header>
        )}

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
