import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User, ToolDefinition, DashboardPreferences } from '@app-types/index'
import { authService } from '@services/auth.service'
import { toolsService } from '@services/tools.service'
import { preferencesService } from '@services/preferences.service'

const DEFAULT_PREFERENCES: DashboardPreferences = { hideComingSoonTools: false, toolOrder: [] }

interface AuthContextType {
  user: User | null
  tools: ToolDefinition[]
  dashboardPreferences: DashboardPreferences
  isAuthenticated: boolean
  isAdmin: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasToolAccess: (toolKey: string) => boolean
  updateDashboardPreferences: (patch: Partial<DashboardPreferences>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tools, setTools] = useState<ToolDefinition[]>([])
  const [dashboardPreferences, setDashboardPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    Promise.all([authService.me(), toolsService.list(), preferencesService.getDashboard()])
      .then(([meRes, toolsRes, prefsRes]) => {
        setUser(meRes.data.user)
        setTools(toolsRes.data.tools)
        setDashboardPreferences(prefsRes.data)
      })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await authService.login(email, password)
    localStorage.setItem('token', data.token)
    setUser(data.user)

    const [{ data: toolsData }, { data: prefsData }] = await Promise.all([
      toolsService.list(),
      preferencesService.getDashboard(),
    ])
    setTools(toolsData.tools)
    setDashboardPreferences(prefsData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setTools([])
    setDashboardPreferences(DEFAULT_PREFERENCES)
  }

  const hasToolAccess = (toolKey: string) => {
    if (user?.role === 'ADMIN') return true
    return tools.some((tool) => tool.key === toolKey && tool.hasAccess)
  }

  const updateDashboardPreferences = async (patch: Partial<DashboardPreferences>) => {
    const previous = dashboardPreferences
    setDashboardPreferences({ ...previous, ...patch })
    try {
      const { data } = await preferencesService.updateDashboard(patch)
      setDashboardPreferences(data)
    } catch {
      setDashboardPreferences(previous)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        tools,
        dashboardPreferences,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        loading,
        login,
        logout,
        hasToolAccess,
        updateDashboardPreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
