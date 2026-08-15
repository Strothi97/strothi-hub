import api from './api'
import { API_ENDPOINTS } from '@config/api'
import type { DashboardPreferences } from '@app-types/index'

export const preferencesService = {
  getDashboard: () => api.get<DashboardPreferences>(API_ENDPOINTS.preferences.dashboard),

  updateDashboard: (data: Partial<DashboardPreferences>) =>
    api.put<DashboardPreferences>(API_ENDPOINTS.preferences.dashboard, data),
}
