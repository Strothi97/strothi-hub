import { NavLink, Outlet } from 'react-router-dom'

export function FarsiLayout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `farsi-nav__link ${isActive ? 'is-active' : ''}`.trim()

  return (
    <div>
      <h1>Farsi-Lernapp</h1>
      <nav className="farsi-nav">
        <NavLink to="/farsi" end className={linkClass}>
          Wörterbuch
        </NavLink>
        <NavLink to="/farsi/karteikarten" className={linkClass}>
          Karteikarten
        </NavLink>
        <NavLink to="/farsi/statistiken" className={linkClass}>
          Statistiken
        </NavLink>
        <NavLink
          to="/farsi/arbeitsflaeche"
          className={({ isActive }) => `${linkClass({ isActive })} farsi-nav__desktop-only`.trim()}
        >
          Arbeitsfläche
        </NavLink>
        <NavLink to="/farsi/alphabet" className={linkClass}>
          Alphabet
        </NavLink>
        <span className="farsi-nav__spacer farsi-nav__desktop-only" />
        <NavLink to="/farsi/import" className={({ isActive }) => `${linkClass({ isActive })} farsi-nav__desktop-only`.trim()}>
          Import
        </NavLink>
      </nav>
      <div className="farsi-content">
        <Outlet />
      </div>
    </div>
  )
}
