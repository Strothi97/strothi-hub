import api from './api'
import { API_ENDPOINTS } from '@config/api'
import type { User } from '@app-types/index'

export const authService = {
  login: (email: string, password: string) =>
    api.post<{ user: User; token: string }>(API_ENDPOINTS.auth.login, { email, password }),

  me: () => api.get<{ user: User }>(API_ENDPOINTS.auth.me),
}
