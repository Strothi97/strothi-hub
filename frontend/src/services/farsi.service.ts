import api from './api'
import { API_ENDPOINTS } from '@config/api'
import type { FarsiEntry, FarsiEntryInput, FarsiImportResult, FarsiWordType } from '@app-types/farsi'

export interface FarsiListFilters {
  search?: string
  type?: FarsiWordType
  onlyIncomplete?: boolean
}

export const farsiService = {
  listEntries: (filters: FarsiListFilters = {}) =>
    api.get<{ entries: FarsiEntry[] }>(API_ENDPOINTS.farsi.entries, {
      params: {
        search: filters.search || undefined,
        type: filters.type || undefined,
        onlyIncomplete: filters.onlyIncomplete ? 'true' : undefined,
      },
    }),

  createEntry: (input: Partial<FarsiEntryInput>) =>
    api.post<{ entry: FarsiEntry }>(API_ENDPOINTS.farsi.entries, input),

  updateEntry: (id: string, input: Partial<FarsiEntryInput>) =>
    api.put<{ entry: FarsiEntry }>(API_ENDPOINTS.farsi.entry(id), input),

  deleteEntry: (id: string) => api.delete(API_ENDPOINTS.farsi.entry(id)),

  importEntries: (rawEntries: unknown[]) =>
    api.post<FarsiImportResult>(API_ENDPOINTS.farsi.import, rawEntries),
}
