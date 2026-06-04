// Globale TypeScript-Typen

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
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
