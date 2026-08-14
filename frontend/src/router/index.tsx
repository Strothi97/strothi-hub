import { Routes, Route } from 'react-router-dom'
import { AppShell } from '@components/layout/AppShell'
import { ProtectedRoute } from '@components/common/ProtectedRoute'
import { Login } from '@pages/Login'
import { Dashboard } from '@pages/Dashboard'
import { AdminUsers } from '@pages/admin/Users'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />

          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/admin/users" element={<AdminUsers />} />
          </Route>

          {/* Weitere Tool-Routen hier ergänzen, z.B. /farsi */}
        </Route>
      </Route>
    </Routes>
  )
}
