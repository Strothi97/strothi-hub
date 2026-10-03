import { NavLink, Outlet } from 'react-router-dom'

export function HaushaltsbuchLayout() {
  const linkClass = ({ isActive }: { isActive: boolean }) => `farsi-nav__link ${isActive ? 'is-active' : ''}`.trim()

  return (
    <div>
      <h1>Haushaltsbuch</h1>
      <nav className="farsi-nav haushalt-nav">
        <NavLink to="/haushaltsbuch" end className={linkClass}>
          Übersicht
        </NavLink>
        <NavLink to="/haushaltsbuch/buchungen" className={linkClass}>
          Buchungen
        </NavLink>
        <NavLink to="/haushaltsbuch/jahr" className={linkClass}>
          Jahr
        </NavLink>
        <NavLink to="/haushaltsbuch/verwaltung" className={linkClass}>
          Verwaltung
        </NavLink>
      </nav>
      <div className="farsi-content">
        <Outlet />
      </div>
    </div>
  )
}
