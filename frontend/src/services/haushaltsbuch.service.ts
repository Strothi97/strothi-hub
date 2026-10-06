import api from './api'
import { API_ENDPOINTS } from '@config/api'
import type {
  Buchung,
  BuchungInput,
  Kasse,
  Gesamt,
  Haendler,
  HaendlerVorschlag,
  Kategorie,
  KategorieTyp,
  MonatsUebersicht,
  JahresUebersicht,
} from '@app-types/haushaltsbuch'

const endpoints = API_ENDPOINTS.haushaltsbuch

export const haushaltsbuchService = {
  getKasse: () => api.get<{ kasse: Kasse | null }>(endpoints.kasse),
  setKasse: (input: Kasse) => api.put<{ kasse: Kasse }>(endpoints.kasse, input),

  listKategorien: () => api.get<{ kategorien: Kategorie[] }>(endpoints.kategorien),
  createKategorie: (input: { name: string; typ: KategorieTyp; parentId: string | null; inStatistik?: boolean }) =>
    api.post(endpoints.kategorien, input),
  updateKategorie: (id: string, input: { name?: string; inStatistik?: boolean; parentId?: string | null }) =>
    api.put(endpoints.kategorie(id), input),
  deleteKategorie: (id: string) => api.delete(endpoints.kategorie(id)),
  sortiereKategorien: (ids: string[]) => api.post(`${endpoints.kategorien}/sortieren`, { ids }),

  listBuchungen: (params?: { von?: string; bis?: string; kategorieId?: string; suche?: string }) =>
    api.get<{ buchungen: Buchung[] }>(endpoints.buchungen, { params }),
  createBuchung: (input: BuchungInput) => api.post(endpoints.buchungen, input),
  createBuchungenBatch: (items: BuchungInput[]) => api.post<{ anzahl: number }>(`${endpoints.buchungen}/batch`, { items }),
  updateBuchung: (id: string, input: BuchungInput) => api.put(endpoints.buchung(id), input),
  deleteBuchung: (id: string) => api.delete(endpoints.buchung(id)),

  listHaendler: () => api.get<{ haendler: Haendler[] }>(`/haushaltsbuch/haendler`),
  haendlerVorschlag: (name: string) =>
    api.get<{ vorschlag: HaendlerVorschlag | null }>(`/haushaltsbuch/haendler/vorschlag`, { params: { name } }),
  createHaendler: (name: string) => api.post(`/haushaltsbuch/haendler`, { name }),
  updateHaendler: (id: string, name: string) => api.put(`/haushaltsbuch/haendler/${id}`, { name }),
  deleteHaendler: (id: string) => api.delete(`/haushaltsbuch/haendler/${id}`),
  gesamt: () => api.get<{ gesamt: Gesamt }>(`/haushaltsbuch/uebersicht/gesamt`),

  monatsUebersicht: (jahr: number, monat: number) =>
    api.get<{ uebersicht: MonatsUebersicht }>(endpoints.uebersichtMonat, { params: { jahr, monat } }),
  jahresUebersicht: (jahr: number) =>
    api.get<{ uebersicht: JahresUebersicht }>(endpoints.uebersichtJahr, { params: { jahr } }),
}
