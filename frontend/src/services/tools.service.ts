import api from './api'
import { API_ENDPOINTS } from '@config/api'
import type { ToolDefinition } from '@app-types/index'

export const toolsService = {
  list: () => api.get<{ tools: ToolDefinition[] }>(API_ENDPOINTS.tools),
}
