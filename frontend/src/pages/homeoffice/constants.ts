export const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

export const WEEKDAY_NAMES_FULL = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']
export const WEEKDAY_NAMES_SHORT = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr']

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseISODate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getMonday(date: Date): Date {
  const day = date.getDay() // 0 = Sonntag ... 6 = Samstag
  const diff = day === 0 ? -6 : 1 - day
  const result = new Date(date)
  result.setDate(result.getDate() + diff)
  return result
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// ISO-8601-Kalenderwoche: Woche 1 ist die Woche, die den ersten Donnerstag
// des Jahres enthält (Wochen beginnen montags).
export function getISOWeekNumber(date: Date): number {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const weekday = utcDate.getUTCDay() || 7 // Sonntag(0) -> 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - weekday)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
