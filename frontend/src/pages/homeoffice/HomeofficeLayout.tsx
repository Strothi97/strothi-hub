import { NavLink, Outlet } from 'react-router-dom'

export function HomeofficeLayout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `homeoffice-nav__link ${isActive ? 'is-active' : ''}`.trim()

  return (
    <div>
      <h1>Arbeitsnachweis</h1>
      <nav className="homeoffice-nav">
        <NavLink to="/homeoffice" end className={linkClass}>
          Monat
        </NavLink>
        <NavLink to="/homeoffice/jahr" className={linkClass}>
          Jahr
        </NavLink>
        <NavLink to="/homeoffice/einstellungen" className={linkClass}>
          Einstellungen
        </NavLink>
      </nav>
      <div className="homeoffice-content">
        <Outlet />
      </div>
    </div>
  )
}
