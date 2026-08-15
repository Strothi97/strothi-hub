import { Routes, Route } from 'react-router-dom'
import { AppShell } from '@components/layout/AppShell'
import { ProtectedRoute } from '@components/common/ProtectedRoute'
import { Login } from '@pages/Login'
import { Dashboard } from '@pages/Dashboard'
import { AdminUsers } from '@pages/admin/Users'
import { HomeofficeLayout } from '@pages/homeoffice/HomeofficeLayout'
import { Woche } from '@pages/homeoffice/Woche'
import { Monat } from '@pages/homeoffice/Monat'
import { Jahr } from '@pages/homeoffice/Jahr'
import { Einstellungen } from '@pages/homeoffice/Einstellungen'

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

          <Route path="/homeoffice" element={<ProtectedRoute requireTool="homeoffice" />}>
            <Route element={<HomeofficeLayout />}>
              <Route index element={<Woche />} />
              <Route path="monat" element={<Monat />} />
              <Route path="jahr" element={<Jahr />} />
              <Route path="einstellungen" element={<Einstellungen />} />
            </Route>
          </Route>

          {/* Weitere Tool-Routen hier ergänzen, z.B. /farsi */}
        </Route>
      </Route>
    </Routes>
  )
}
