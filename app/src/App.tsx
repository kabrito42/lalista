import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import PlaceholderPage from './pages/PlaceholderPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<PlaceholderPage title="Dashboard" />} />
            <Route path="recipes" element={<PlaceholderPage title="Recipes" />} />
            <Route path="session" element={<PlaceholderPage title="Weekly Session" />} />
            <Route path="meals" element={<PlaceholderPage title="Meals" />} />
            <Route path="picker" element={<PlaceholderPage title="Item Picker" />} />
            <Route path="review" element={<PlaceholderPage title="Review & Merge" />} />
            <Route path="finalise" element={<PlaceholderPage title="Finalise" />} />
            <Route path="longlist" element={<PlaceholderPage title="Longlist" />} />
            <Route path="pantry" element={<PlaceholderPage title="Pantry" />} />
            <Route path="categories" element={<PlaceholderPage title="Categories" />} />
            <Route
              path="coles-preferences"
              element={<PlaceholderPage title="Coles Preferences" />}
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
