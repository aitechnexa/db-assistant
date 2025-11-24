import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import ChatModePage from './pages/ChatModePage'
import ClassicModePage from './pages/ClassicModePage'
import DatabasesPage from './pages/DatabasesPage'
import AdminDashboard from './pages/AdminDashboard'
import Layout from './components/Layout'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import ErrorBoundary from './ErrorBoundary'
import { QuotaProvider } from './context/QuotaContext'

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token')
    return token ? children : <Navigate to="/auth" replace />
  }

  return (
    <ErrorBoundary>
      <QuotaProvider>
        <Router>
          <Routes>
            <Route path="/auth" element={<Auth darkMode={darkMode} />} />

            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding darkMode={darkMode} />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Layout darkMode={darkMode} setDarkMode={setDarkMode} />}>
              <Route index element={<Navigate to="/chat" replace />} />

              <Route
                path="chat"
                element={
                  <ProtectedRoute>
                    <ChatModePage darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="classic"
                element={
                  <ProtectedRoute>
                    <ClassicModePage darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="databases"
                element={
                  <ProtectedRoute>
                    <DatabasesPage darkMode={darkMode} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="admin"
                element={
                  <ProtectedRoute>
                    <ProtectedAdminRoute>
                      <AdminDashboard darkMode={darkMode} />
                    </ProtectedAdminRoute>
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </Router>
      </QuotaProvider>
    </ErrorBoundary>
  )
}

export default App
