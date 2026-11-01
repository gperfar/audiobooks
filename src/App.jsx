import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell.jsx'
import { AdminModeProvider } from './contexts/AdminModeContext.jsx'
import { useAdminMode } from './contexts/useAdminMode.js'
import { EditorPage } from './pages/EditorPage.jsx'
import { HomePage } from './pages/HomePage.jsx'
import { PlayerPage } from './pages/PlayerPage.jsx'
import { UploadPage } from './pages/UploadPage.jsx'

function AdminOnly({ children }) {
  const { isAdminMode } = useAdminMode()
  return isAdminMode ? children : <Navigate to="/" replace />
}

function App() {
  return (
    <AdminModeProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/upload"
            element={
              <AdminOnly>
                <UploadPage />
              </AdminOnly>
            }
          />
          <Route
            path="/editor/:storyId"
            element={
              <AdminOnly>
                <EditorPage />
              </AdminOnly>
            }
          />
          <Route path="/player/:storyId" element={<PlayerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </AdminModeProvider>
  )
}

export default App
