export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const API_ENDPOINTS = {
  // Auth
  auth: {
    login: '/auth/login',
    me: '/auth/me',
    changePassword: '/auth/change-password',
    deleteMe: '/auth/me',
    invite: (token: string) => `/auth/invite/${token}`,
  },
  tools: '/tools',
  preferences: {
    dashboard: '/preferences/dashboard',
  },
  admin: {
    users: '/admin/users',
    user: (id: string) => `/admin/users/${id}`,
    userToolAccess: (id: string) => `/admin/users/${id}/tool-access`,
    resendInvite: (id: string) => `/admin/users/${id}/resend-invite`,
  },
  push: {
    publicKey: '/push/public-key',
    subscribe: '/push/subscribe',
    unsubscribe: '/push/unsubscribe',
    subscriptions: '/push/subscriptions',
    subscription: (id: string) => `/push/subscriptions/${id}`,
  },
  homeoffice: {
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
    studyStreak: '/farsi/study/streak',
    letterProgress: '/farsi/study/letters/progress',
    letterReview: (char: string, position: string) =>
      `/farsi/study/letters/${encodeURIComponent(char)}/${position}/review`,
  },
  erinnerungen: {
    reminders: '/erinnerungen/reminders',
    reminder: (id: string) => `/erinnerungen/reminders/${id}`,
    people: '/erinnerungen/people',
    person: (id: string) => `/erinnerungen/people/${id}`,
    personPhoto: (id: string) => `/erinnerungen/people/${id}/photo`,
    personCongrats: (id: string) => `/erinnerungen/people/${id}/congrats`,
  },
  kochbuch: {
    recipes: '/kochbuch/recipes',
    recipe: (id: string) => `/kochbuch/recipes/${id}`,
    exportRecipe: (id: string) => `/kochbuch/recipes/${id}/export`,
    recipePhoto: (id: string) => `/kochbuch/recipes/${id}/photo`,
    stepPhoto: (id: string, index: number) => `/kochbuch/recipes/${id}/steps/${index}/photo`,
    recipeRating: (id: string) => `/kochbuch/recipes/${id}/rating`,
    tags: '/kochbuch/tags',
    importStatus: '/kochbuch/import/status',
    importAnalyze: '/kochbuch/import/analyze',
    importAnalyzeText: '/kochbuch/import/analyze-text',
    export: '/kochbuch/export',
    importFile: '/kochbuch/import-file',
    importText: '/kochbuch/import-text',
  },
  // Weitere Endpunkte hier ergänzen
} as const
