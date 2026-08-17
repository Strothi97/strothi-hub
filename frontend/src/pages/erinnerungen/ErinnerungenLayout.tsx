import { NavLink, Outlet } from 'react-router-dom'

export function ErinnerungenLayout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `farsi-nav__link ${isActive ? 'is-active' : ''}`.trim()

  return (
    <div>
      <h1>Erinnerungen</h1>
      <nav className="farsi-nav">
        <NavLink to="/erinnerungen" end className={linkClass}>
          Erinnerungen
        </NavLink>
        <NavLink to="/erinnerungen/geburtstage" className={linkClass}>
          Geburtstage
        </NavLink>
      </nav>
      <div className="farsi-content">
        <Outlet />
      </div>
    </div>
  )
}
