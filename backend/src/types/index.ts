// Globale Backend-Typen

export interface JwtPayload {
  userId: string
  iat?: number
  exp?: number
}

export interface PaginationQuery {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Weitere Typen hier ergänzen
