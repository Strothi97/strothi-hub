import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'

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
          <button className="btn btn-secondary btn-sm" onClick={logout}>
            Abmelden
          </button>
        </div>
      </header>

      <nav className="app-shell__nav">
        <NavLink to="/" end className={navLinkClass} aria-label="Übersicht">
          <span className="app-shell__nav-icon" aria-hidden="true">🏠</span>
          <span className="app-shell__nav-label">Übersicht</span>
        </NavLink>
        <NavLink to="/konto" className={navLinkClass} aria-label="Konto">
          <span className="app-shell__nav-icon" aria-hidden="true">👤</span>
          <span className="app-shell__nav-label">Konto</span>
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin/users" className={navLinkClass} aria-label="Nutzer">
            <span className="app-shell__nav-icon" aria-hidden="true">🛠️</span>
            <span className="app-shell__nav-label">Nutzer</span>
          </NavLink>
        )}
      </nav>

      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  )
}
