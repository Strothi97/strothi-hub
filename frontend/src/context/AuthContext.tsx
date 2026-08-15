import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User, ToolDefinition } from '@app-types/index'
import { authService } from '@services/auth.service'
import { toolsService } from '@services/tools.service'

interface AuthContextType {
  user: User | null
  tools: ToolDefinition[]
  isAuthenticated: boolean
  isAdmin: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasToolAccess: (toolKey: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tools, setTools] = useState<ToolDefinition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    Promise.all([authService.me(), toolsService.list()])
      .then(([meRes, toolsRes]) => {
        setUser(meRes.data.user)
        setTools(toolsRes.data.tools)
      })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await authService.login(email, password)
    localStorage.setItem('token', data.token)
    setUser(data.user)

    const { data: toolsData } = await toolsService.list()
    setTools(toolsData.tools)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setTools([])
  }

  const hasToolAccess = (toolKey: string) => {
    if (user?.role === 'ADMIN') return true
    return tools.some((tool) => tool.key === toolKey && tool.hasAccess)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        tools,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        loading,
        login,
        logout,
        hasToolAccess,
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
