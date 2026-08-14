// Globale TypeScript-Typen

export type Role = 'ADMIN' | 'USER'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
  createdAt: string
}

export interface ToolDefinition {
  key: string
  name: string
  description: string
  icon: string
  path: string
  comingSoon?: boolean
  hasAccess: boolean
}

export interface AdminUser extends User {
  toolAccess: string[]
}

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface ApiError {
  message: string
  statusCode: number
}

// Weitere Typen hier ergänzen
