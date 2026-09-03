import { NavLink, Outlet } from 'react-router-dom'

export function KochbuchLayout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `farsi-nav__link ${isActive ? 'is-active' : ''}`.trim()

  return (
    <div>
      <h1>Kochbuch</h1>
      <nav className="farsi-nav">
        <NavLink to="/kochbuch" end className={linkClass}>
          Rezepte
        </NavLink>
        <NavLink to="/kochbuch/import" className={linkClass}>
          Import
        </NavLink>
      </nav>
      <div className="farsi-content">
        <Outlet />
      </div>
    </div>
  )
}
