import { NavLink, Outlet } from 'react-router-dom'

export function TrainingsplanLayout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `farsi-nav__link ${isActive ? 'is-active' : ''}`.trim()

  return (
    <div>
      <h1>Trainingsplan</h1>
      <nav className="farsi-nav">
        <NavLink to="/trainingsplan" end className={linkClass}>
          Übersicht
        </NavLink>
        <NavLink to="/trainingsplan/uebungen" className={linkClass}>
          Übungen
        </NavLink>
      </nav>
      <div className="farsi-content">
        <Outlet />
      </div>
    </div>
  )
}
