import { Routes, Route } from 'react-router-dom'
import { AppShell } from '@components/layout/AppShell'
import { ProtectedRoute } from '@components/common/ProtectedRoute'
import { Login } from '@pages/Login'
import { AcceptInvite } from '@pages/AcceptInvite'
import { Dashboard } from '@pages/Dashboard'
import { Konto } from '@pages/Konto'
import { AdminUsers } from '@pages/admin/Users'
import { HomeofficeLayout } from '@pages/homeoffice/HomeofficeLayout'
import { Woche } from '@pages/homeoffice/Woche'
import { Monat } from '@pages/homeoffice/Monat'
import { Jahr } from '@pages/homeoffice/Jahr'
import { Einstellungen } from '@pages/homeoffice/Einstellungen'
import { FarsiLayout } from '@pages/farsi/FarsiLayout'
import { Woerterbuch } from '@pages/farsi/Woerterbuch'
import { Import } from '@pages/farsi/Import'
import { Karteikarten } from '@pages/farsi/Karteikarten'
import { Statistiken } from '@pages/farsi/Statistiken'
import { Arbeitsflaeche } from '@pages/farsi/Arbeitsflaeche'
import { Alphabet } from '@pages/farsi/AlphabetPage'
import { ErinnerungenLayout } from '@pages/erinnerungen/ErinnerungenLayout'
import { Erinnerungen } from '@pages/erinnerungen/Erinnerungen'
import { Geburtstage } from '@pages/erinnerungen/Geburtstage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/einladung/:token" element={<AcceptInvite />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/konto" element={<Konto />} />

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

          <Route path="/farsi" element={<ProtectedRoute requireTool="farsi" />}>
            <Route element={<FarsiLayout />}>
              <Route index element={<Woerterbuch />} />
              <Route path="import" element={<Import />} />
              <Route path="karteikarten" element={<Karteikarten />} />
              <Route path="statistiken" element={<Statistiken />} />
              <Route path="arbeitsflaeche" element={<Arbeitsflaeche />} />
              <Route path="alphabet" element={<Alphabet />} />
            </Route>
          </Route>

          <Route path="/erinnerungen" element={<ProtectedRoute requireTool="erinnerungen" />}>
            <Route element={<ErinnerungenLayout />}>
              <Route index element={<Erinnerungen />} />
              <Route path="geburtstage" element={<Geburtstage />} />
            </Route>
          </Route>

          {/* Weitere Tool-Routen hier ergänzen */}
        </Route>
      </Route>
    </Routes>
  )
}
