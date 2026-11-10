import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import HeatmapPage from './pages/HeatmapPage';
import AddHabitPage from './pages/AddHabitPage';
import HabitDetail from './pages/HabitDetail';
import EditHabit from './pages/EditHabit';
import NotFound from './pages/NotFound';

/**
 * Root Application Component
 * Sets up ErrorBoundary, BrowserRouter, and nested routes.
 * /login and /register sit outside the Layout.
 * Protected routes sit within ProtectedRoute and Layout.
 */
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public routes outside Layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes wrapped in ProtectedRoute and Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/heatmap" element={<HeatmapPage />} />
              <Route path="/habits/new" element={<AddHabitPage />} />
              <Route path="/habits/:id" element={<HabitDetail />} />
              <Route path="/habits/:id/edit" element={<EditHabit />} />
            </Route>
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
