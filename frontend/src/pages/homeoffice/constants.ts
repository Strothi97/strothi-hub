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
