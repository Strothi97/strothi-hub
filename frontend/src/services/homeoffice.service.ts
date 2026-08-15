import api from './api'
import { API_ENDPOINTS } from '@config/api'
import type {
  FederalStateEntry,
  MonthResponse,
  VacationAdjustment,
  WeekResponse,
  WorkDayStatus,
  YearAggregation,
  Bundesland,
} from '@app-types/homeoffice'

export const homeofficeService = {
  getWeek: (date: string) => api.get<WeekResponse>(API_ENDPOINTS.homeoffice.week, { params: { date } }),

  getMonth: (year: number, month: number) =>
    api.get<MonthResponse>(API_ENDPOINTS.homeoffice.month, { params: { year, month } }),

  setDay: (date: string, status: WorkDayStatus | null) =>
    api.put<{ day: { date: string; status: WorkDayStatus | null; isAutoHoliday: boolean } }>(
      API_ENDPOINTS.homeoffice.day,
      { date, status },
    ),

  getYear: (year: number) => api.get<YearAggregation>(API_ENDPOINTS.homeoffice.year, { params: { year } }),

  listAdjustments: (year: number) =>
    api.get<{ adjustments: VacationAdjustment[] }>(API_ENDPOINTS.homeoffice.adjustments, { params: { year } }),

  createAdjustment: (data: { year: number; amount: number; reason: string }) =>
    api.post<{ adjustment: VacationAdjustment }>(API_ENDPOINTS.homeoffice.adjustments, data),

  deleteAdjustment: (id: string) => api.delete(API_ENDPOINTS.homeoffice.adjustment(id)),

  listStates: () => api.get<{ states: FederalStateEntry[] }>(API_ENDPOINTS.homeoffice.states),

  addState: (data: { state: Bundesland; validFrom: string }) =>
    api.post<{ state: FederalStateEntry }>(API_ENDPOINTS.homeoffice.states, data),

  deleteState: (id: string) => api.delete(API_ENDPOINTS.homeoffice.state(id)),
}
