import api from './api'
import { API_ENDPOINTS } from '@config/api'
import type { AdminUser, Role, User } from '@app-types/index'

export const adminService = {
  listUsers: () => api.get<{ users: AdminUser[] }>(API_ENDPOINTS.admin.users),

  inviteUser: (data: { email: string; name: string }) =>
    api.post<{ user: User; emailSent: boolean }>(API_ENDPOINTS.admin.users, data),

  resendInvite: (id: string) => api.post<{ emailSent: boolean }>(API_ENDPOINTS.admin.resendInvite(id)),

  updateUser: (id: string, data: { role?: Role; isActive?: boolean }) =>
    api.patch<{ user: AdminUser }>(API_ENDPOINTS.admin.user(id), data),

  setToolAccess: (id: string, toolKeys: string[]) =>
    api.put<{ toolAccess: string[] }>(API_ENDPOINTS.admin.userToolAccess(id), { toolKeys }),
}
