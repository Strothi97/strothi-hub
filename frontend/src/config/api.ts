export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const API_ENDPOINTS = {
  // Auth
  auth: {
    login: '/auth/login',
    me: '/auth/me',
  },
  tools: '/tools',
  preferences: {
    dashboard: '/preferences/dashboard',
  },
  admin: {
    users: '/admin/users',
    user: (id: string) => `/admin/users/${id}`,
    userToolAccess: (id: string) => `/admin/users/${id}/tool-access`,
  },
  homeoffice: {
    week: '/homeoffice/week',
    day: '/homeoffice/day',
    month: '/homeoffice/month',
    year: '/homeoffice/year',
    adjustments: '/homeoffice/adjustments',
    adjustment: (id: string) => `/homeoffice/adjustments/${id}`,
    states: '/homeoffice/states',
    state: (id: string) => `/homeoffice/states/${id}`,
  },
  farsi: {
    entries: '/farsi/entries',
    entry: (id: string) => `/farsi/entries/${id}`,
    import: '/farsi/import',
    studySession: '/farsi/study/session',
    studyReview: (entryId: string) => `/farsi/study/${entryId}/review`,
    studyStats: '/farsi/study/stats',
  },
  // Weitere Endpunkte hier ergänzen
} as const
