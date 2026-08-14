import { useEffect, useState } from 'react'

function getInitialTheme(): 'light' | 'dark' {
  return document.documentElement.classList.contains('light') ? 'light' : 'dark'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
      aria-label={theme === 'light' ? 'Dunkles Design aktivieren' : 'Helles Design aktivieren'}
      title={theme === 'light' ? 'Dunkles Design' : 'Helles Design'}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
