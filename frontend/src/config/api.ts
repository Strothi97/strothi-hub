export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const API_ENDPOINTS = {
  // Auth
  auth: {
    login: '/auth/login',
    me: '/auth/me',
  },
  tools: '/tools',
  admin: {
    users: '/admin/users',
    user: (id: string) => `/admin/users/${id}`,
    userToolAccess: (id: string) => `/admin/users/${id}/tool-access`,
  },
  // Weitere Endpunkte hier ergänzen
} as const
