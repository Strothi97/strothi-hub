import { useAuth } from '@context/AuthContext'

export function ThemeToggle() {
  const { dashboardPreferences, updateDashboardPreferences } = useAuth()
  const theme = dashboardPreferences.theme

  const handleClick = () => {
    updateDashboardPreferences({ theme: theme === 'light' ? 'dark' : 'light' })
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={handleClick}
      aria-label={theme === 'light' ? 'Dunkles Design aktivieren' : 'Helles Design aktivieren'}
      title={theme === 'light' ? 'Dunkles Design' : 'Helles Design'}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
