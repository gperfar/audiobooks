import { createContext, useEffect, useMemo, useState } from 'react'

const ADMIN_MODE_STORAGE_KEY = 'audiolibros-admin-mode'

const AdminModeContext = createContext(null)

function readStoredAdminMode() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(ADMIN_MODE_STORAGE_KEY) === 'true'
}

export function AdminModeProvider({ children }) {
  const [isAdminMode, setIsAdminMode] = useState(readStoredAdminMode)

  useEffect(() => {
    window.localStorage.setItem(ADMIN_MODE_STORAGE_KEY, String(isAdminMode))
  }, [isAdminMode])

  const value = useMemo(
    () => ({
      isAdminMode,
      toggleAdminMode: () => setIsAdminMode((currentValue) => !currentValue),
      setAdminMode: setIsAdminMode,
    }),
    [isAdminMode],
  )

  return <AdminModeContext value={value}>{children}</AdminModeContext>
}

export { AdminModeContext }
