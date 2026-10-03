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
