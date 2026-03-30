import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import RecipesPage from './pages/RecipesPage'
import CategoriesPage from './pages/CategoriesPage'
import PantryPage from './pages/PantryPage'
import LonglistPage from './pages/LonglistPage'
import ColesPreferencesPage from './pages/ColesPreferencesPage'
import SessionPage from './pages/SessionPage'
import MealsPage from './pages/MealsPage'
import PickerPage from './pages/PickerPage'
import ReviewPage from './pages/ReviewPage'
import FinalisePage from './pages/FinalisePage'
import DashboardPage from './pages/DashboardPage'

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
            <Route index element={<DashboardPage />} />
            <Route path="recipes" element={<RecipesPage />} />
            <Route path="session" element={<SessionPage />} />
            <Route path="meals" element={<MealsPage />} />
            <Route path="picker" element={<PickerPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="finalise" element={<FinalisePage />} />
            <Route path="longlist" element={<LonglistPage />} />
            <Route path="pantry" element={<PantryPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="coles-preferences" element={<ColesPreferencesPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
