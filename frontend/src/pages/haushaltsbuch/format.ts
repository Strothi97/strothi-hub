// Hilfsfunktionen für das Tool "Haushaltsbuch"

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
export function formatEuro(value: number): string {
  return euro.format(value)
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
