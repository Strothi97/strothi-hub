import api from './api'
import { API_ENDPOINTS } from '@config/api'
import type { AdminUser, Role } from '@app-types/index'

export const adminService = {
  listUsers: () => api.get<{ users: AdminUser[] }>(API_ENDPOINTS.admin.users),

  createUser: (data: { email: string; password: string; name: string; role?: Role }) =>
    api.post<{ user: AdminUser }>(API_ENDPOINTS.admin.users, data),

  updateUser: (id: string, data: { role?: Role; isActive?: boolean }) =>
    api.patch<{ user: AdminUser }>(API_ENDPOINTS.admin.user(id), data),

  setToolAccess: (id: string, toolKeys: string[]) =>
    api.put<{ toolAccess: string[] }>(API_ENDPOINTS.admin.userToolAccess(id), { toolKeys }),
}
