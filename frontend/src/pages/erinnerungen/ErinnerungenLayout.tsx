import { NavLink, Outlet } from 'react-router-dom'
import { PushToggle } from './PushToggle'

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
        <span className="farsi-nav__spacer" />
        <PushToggle />
      </nav>
      <div className="farsi-content">
        <Outlet />
      </div>
    </div>
  )
}
