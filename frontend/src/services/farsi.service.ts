import api from './api'
import { API_ENDPOINTS } from '@config/api'
import type {
  FarsiEntry,
  FarsiEntryInput,
  FarsiImportResult,
  FarsiWordType,
  FarsiStudyMode,
  FarsiStudySession,
  FarsiReviewResult,
  FarsiBoxStats,
} from '@app-types/farsi'

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

  getStudySession: (mode: FarsiStudyMode, limit?: number) =>
    api.get<FarsiStudySession>(API_ENDPOINTS.farsi.studySession, { params: { mode, limit } }),

  reviewCard: (entryId: string, mode: FarsiStudyMode, correct: boolean) =>
    api.post<FarsiReviewResult>(API_ENDPOINTS.farsi.studyReview(entryId), { mode, correct }),

  getBoxStats: (mode: FarsiStudyMode) =>
    api.get<FarsiBoxStats>(API_ENDPOINTS.farsi.studyStats, { params: { mode } }),
}
