// Hilfsfunktionen für das Tool "Haushaltsbuch"

import type { Kategorie, KategorieSumme } from '@app-types/haushaltsbuch'

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
export function formatEuro(value: number): string {
  return euro.format(value)
}

const prozent = new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 1 })
// Anteil (0..1) als Prozent, z.B. 0.082 -> "8,2 %". Ohne sinnvollen Gesamtwert leer.
export function formatAnteil(teil: number, gesamt: number): string {
  if (gesamt <= 0) return ''
  return prozent.format(teil / gesamt)
}

export const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

// Lokaler Kalendertag als "JJJJ-MM-TT" (nicht toISOString, siehe CLAUDE.md).
export function toDateOnlyLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatDateOnly(value: string): string {
  const [y, m, d] = value.split('-')
  return `${d}.${m}.${y}`
}

// Tippt man "0410", "04.10", "04102026" oder "04.10.26", ergibt das "JJJJ-MM-TT".
// Ohne Jahr gilt das aktuelle Jahr, zweistellige Jahre zählen ab 2000. Ungültiges liefert null.
export function parseDatumEingabe(text: string, heute = new Date()): string | null {
  const m = text.trim().match(/^(\d{1,2})\D?(\d{1,2})(?:\D?(\d{2}|\d{4}))?\.?$/)
  if (!m) return null
  const tag = Number(m[1])
  const monat = Number(m[2])
  const jahr = m[3] ? Number(m[3]) + (m[3].length === 2 ? 2000 : 0) : heute.getFullYear()
  const date = new Date(jahr, monat - 1, tag)
  if (date.getFullYear() !== jahr || date.getMonth() !== monat - 1 || date.getDate() !== tag) return null
  return toDateOnlyLocal(date)
}

// Wochentag + Datum für Listen, z.B. "Sa, 12.09.2026".
export function formatDateWithWeekday(value: string): string {
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const tage = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  return `${tage[date.getDay()]}, ${formatDateOnly(value)}`
}

// Letzter Tag eines Monats als "JJJJ-MM-TT".
export function lastDayOfMonth(jahr: number, monat: number): string {
  const date = new Date(jahr, monat, 0)
  return toDateOnlyLocal(date)
}

export function firstDayOfMonth(jahr: number, monat: number): string {
  return toDateOnlyLocal(new Date(jahr, monat - 1, 1))
}

export function shiftMonth(jahr: number, monat: number, delta: number): { jahr: number; monat: number } {
  const date = new Date(jahr, monat - 1 + delta, 1)
  return { jahr: date.getFullYear(), monat: date.getMonth() + 1 }
}

// Oberste Oberkategorie einer Kategorie-ID (läuft die parentId-Kette nach oben).
function wurzelKategorie(kategorien: Kategorie[], id: string): Kategorie | undefined {
  const nach = new Map(kategorien.map((k) => [k.id, k]))
  let aktuell = nach.get(id)
  const besucht = new Set<string>()
  while (aktuell?.parentId && !besucht.has(aktuell.id)) {
    besucht.add(aktuell.id)
    aktuell = nach.get(aktuell.parentId)
  }
  return aktuell
}

// Fasst Kategorie-Summen auf ihre jeweilige Oberkategorie zusammen, für die Umschaltung
// "Alle Kategorien" / "Nur Oberkategorien". Kategorien ohne Unterkategorie bleiben wie sie sind.
export function rollupZuOberkategorie(summen: KategorieSumme[], kategorien: Kategorie[]): KategorieSumme[] {
  const map = new Map<string, KategorieSumme>()
  for (const s of summen) {
    const wurzel = wurzelKategorie(kategorien, s.id)
    const key = wurzel?.id ?? s.id
    const eintrag = map.get(key) ?? { id: key, name: wurzel?.name ?? s.name, typ: s.typ, pfad: wurzel?.pfad ?? s.pfad, summe: 0 }
    eintrag.summe += s.summe
    map.set(key, eintrag)
  }
  return [...map.values()].sort((a, b) => b.summe - a.summe)
}
