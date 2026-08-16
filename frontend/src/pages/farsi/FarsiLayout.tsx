import { NavLink, Outlet } from 'react-router-dom'

export function FarsiLayout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `farsi-nav__link ${isActive ? 'is-active' : ''}`.trim()

  return (
    <div>
      <h1>Farsi lernen</h1>
      <nav className="farsi-nav">
        <NavLink to="/farsi" end className={linkClass}>
          Wörterbuch
        </NavLink>
        <NavLink to="/farsi/import" className={linkClass}>
          Import
        </NavLink>
      </nav>
      <div className="farsi-content">
        <Outlet />
      </div>
    </div>
  )
}
