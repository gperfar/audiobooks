import { useContext } from 'react'
import { AdminModeContext } from './AdminModeContext.jsx'

export function useAdminMode() {
  const context = useContext(AdminModeContext)

  if (!context) {
    throw new Error('useAdminMode debe usarse dentro de AdminModeProvider.')
  }

  return context
}
