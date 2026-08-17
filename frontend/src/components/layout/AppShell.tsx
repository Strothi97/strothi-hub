import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'
import { ThemeToggle } from '@components/ui/ThemeToggle'

export function AppShell() {
  const { user, isAdmin, logout } = useAuth()

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `app-shell__nav-link ${isActive ? 'is-active' : ''}`.trim()

  return (
    <div className="app-shell">
      <header className="app-shell__topbar">
        <span className="app-shell__brand brand-gradient">Strothi's Hub</span>
        <div className="app-shell__user">
          <span>{user?.name}</span>
          <ThemeToggle />
          <button className="btn btn-secondary btn-sm" onClick={logout}>
            Abmelden
          </button>
        </div>
      </header>

      <nav className="app-shell__nav">
        <NavLink to="/" end className={navLinkClass}>
          🏠 Übersicht
        </NavLink>
        <NavLink to="/konto" className={navLinkClass}>
          👤 Konto
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin/users" className={navLinkClass}>
            🛠️ Nutzer
          </NavLink>
        )}
      </nav>

      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  )
}
