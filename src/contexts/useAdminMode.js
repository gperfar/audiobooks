import { useContext } from 'react'
import { AdminModeContext } from './adminModeContext.js'

export function useAdminMode() {
  const context = useContext(AdminModeContext)

  if (!context) {
    throw new Error('useAdminMode debe usarse dentro de AdminModeProvider.')
  }

  return context
}
