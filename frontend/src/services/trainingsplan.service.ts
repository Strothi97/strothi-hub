import api from './api'
import { API_ENDPOINTS } from '@config/api'
import type {
  Exercise,
  FocusArea,
  ExerciseHistoryEntry,
  ExerciseInput,
  SessionListItem,
  SetInput,
  TrainingSession,
} from '@app-types/trainingsplan'

export const trainingsplanService = {
  listFocusAreas: () => api.get<{ focusAreas: FocusArea[] }>(API_ENDPOINTS.trainingsplan.focusAreas),

  createFocusArea: (input: { name: string; icon: string }) =>
    api.post<{ focusArea: FocusArea }>(API_ENDPOINTS.trainingsplan.focusAreas, input),

  updateFocusArea: (id: string, input: { name?: string; icon?: string }) =>
    api.put<{ focusArea: FocusArea }>(API_ENDPOINTS.trainingsplan.focusArea(id), input),

  deleteFocusArea: (id: string) => api.delete(API_ENDPOINTS.trainingsplan.focusArea(id)),

  listExercises: (params?: { search?: string; focusAreas?: string[]; includeArchived?: boolean }) =>
    api.get<{ exercises: Exercise[] }>(API_ENDPOINTS.trainingsplan.exercises, { params }),

  getExercise: (id: string) => api.get<{ exercise: Exercise }>(API_ENDPOINTS.trainingsplan.exercise(id)),

  createExercise: (input: ExerciseInput) =>
    api.post<{ exercise: Exercise }>(API_ENDPOINTS.trainingsplan.exercises, input),

  updateExercise: (id: string, input: Partial<ExerciseInput>) =>
    api.put<{ exercise: Exercise }>(API_ENDPOINTS.trainingsplan.exercise(id), input),

  deleteExercise: (id: string) => api.delete(API_ENDPOINTS.trainingsplan.exercise(id)),

  uploadExercisePhoto: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('photo', file)
    return api.post<{ exercise: Exercise }>(API_ENDPOINTS.trainingsplan.exercisePhoto(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  uploadExerciseSectionPhoto: (id: string, sectionIndex: number, file: File) => {
    const formData = new FormData()
    formData.append('photo', file)
    return api.post<{ exercise: Exercise }>(
      API_ENDPOINTS.trainingsplan.exerciseSectionPhoto(id, sectionIndex),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  getExerciseHistory: (id: string) =>
    api.get<{ history: ExerciseHistoryEntry[] }>(API_ENDPOINTS.trainingsplan.exerciseHistory(id)),

  listSessions: () => api.get<{ sessions: SessionListItem[] }>(API_ENDPOINTS.trainingsplan.sessions),

  getSession: (id: string) => api.get<{ session: TrainingSession }>(API_ENDPOINTS.trainingsplan.session(id)),

  createSession: (input: { performedAt: string; note?: string | null }) =>
    api.post<{ session: TrainingSession }>(API_ENDPOINTS.trainingsplan.sessions, input),

  updateSession: (id: string, input: { performedAt?: string; note?: string | null }) =>
    api.put<{ session: TrainingSession }>(API_ENDPOINTS.trainingsplan.session(id), input),

  deleteSession: (id: string) => api.delete(API_ENDPOINTS.trainingsplan.session(id)),

  addSessionExercise: (id: string, input: { exerciseId: string; sets: SetInput[] }) =>
    api.post<{ session: TrainingSession }>(API_ENDPOINTS.trainingsplan.sessionExercises(id), input),

  updateSessionExerciseSets: (id: string, sessionExerciseId: string, sets: SetInput[]) =>
    api.put<{ session: TrainingSession }>(API_ENDPOINTS.trainingsplan.sessionExercise(id, sessionExerciseId), {
      sets,
    }),

  removeSessionExercise: (id: string, sessionExerciseId: string) =>
    api.delete<{ session: TrainingSession }>(API_ENDPOINTS.trainingsplan.sessionExercise(id, sessionExerciseId)),
}
