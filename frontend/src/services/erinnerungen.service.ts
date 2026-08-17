import api from './api'
import { API_ENDPOINTS } from '@config/api'
import type { Person, PersonInput, Reminder, ReminderInput } from '@app-types/erinnerungen'

export const erinnerungenService = {
  listReminders: () => api.get<{ reminders: Reminder[] }>(API_ENDPOINTS.erinnerungen.reminders),

  createReminder: (input: ReminderInput) =>
    api.post<{ reminder: Reminder }>(API_ENDPOINTS.erinnerungen.reminders, input),

  updateReminder: (id: string, input: Partial<ReminderInput>) =>
    api.put<{ reminder: Reminder }>(API_ENDPOINTS.erinnerungen.reminder(id), input),

  deleteReminder: (id: string) => api.delete(API_ENDPOINTS.erinnerungen.reminder(id)),

  listPeople: () => api.get<{ people: Person[] }>(API_ENDPOINTS.erinnerungen.people),

  createPerson: (input: PersonInput) => api.post<{ person: Person }>(API_ENDPOINTS.erinnerungen.people, input),

  updatePerson: (id: string, input: Partial<PersonInput>) =>
    api.put<{ person: Person }>(API_ENDPOINTS.erinnerungen.person(id), input),

  deletePerson: (id: string) => api.delete(API_ENDPOINTS.erinnerungen.person(id)),

  uploadPersonPhoto: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('photo', file)
    return api.post<{ person: Person }>(API_ENDPOINTS.erinnerungen.personPhoto(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  setCongrats: (id: string, year: number, congratulated: boolean) =>
    api.post(API_ENDPOINTS.erinnerungen.personCongrats(id), { year, congratulated }),

  getPushPublicKey: () => api.get<{ publicKey: string | null }>(API_ENDPOINTS.erinnerungen.pushPublicKey),

  subscribePush: (subscription: PushSubscriptionJSON) =>
    api.post(API_ENDPOINTS.erinnerungen.pushSubscribe, subscription),

  unsubscribePush: (endpoint: string) => api.post(API_ENDPOINTS.erinnerungen.pushUnsubscribe, { endpoint }),
}
