import api from './api'
import { API_ENDPOINTS } from '@config/api'
import type { User } from '@app-types/index'

export const authService = {
  login: (email: string, password: string) =>
    api.post<{ user: User; token: string }>(API_ENDPOINTS.auth.login, { email, password }),

  me: () => api.get<{ user: User }>(API_ENDPOINTS.auth.me),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post(API_ENDPOINTS.auth.changePassword, { currentPassword, newPassword }),

  deleteAccount: (password: string) => api.delete(API_ENDPOINTS.auth.deleteMe, { data: { password } }),

  getInvite: (token: string) => api.get<{ name: string; email: string }>(API_ENDPOINTS.auth.invite(token)),

  acceptInvite: (token: string, password: string) =>
    api.post(API_ENDPOINTS.auth.invite(token), { password }),
}
