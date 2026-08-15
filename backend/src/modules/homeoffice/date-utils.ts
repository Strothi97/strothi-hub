// Reine Kalenderarithmetik auf lokalen Datumsteilen — für Wochen-/Bereichslogik.
// Für Prisma @db.Date-Felder siehe toPrismaDate()/fromPrismaDate() unten:
// MySQL DATE-Spalten werden von Prisma über die UTC-Repräsentation des JS-Date
// serialisiert, deshalb dort bewusst getrennte Helfer, um Zeitzonen-Verschiebungen
// um einen Tag zu vermeiden.

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Montag der ISO-Woche, die `date` enthält.
export function getMonday(date: Date): Date {
  const day = date.getDay() // 0 = Sonntag ... 6 = Samstag
  const diff = day === 0 ? -6 : 1 - day
  return addDays(date, diff)
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

// Alle Werktage (Mo–Fr) im Bereich [from, to], jeweils inklusive.
export function eachWeekdayInRange(from: Date, to: Date): Date[] {
  const days: Date[] = []
  let current = new Date(from)
  while (current <= to) {
    if (!isWeekend(current)) days.push(new Date(current))
    current = addDays(current, 1)
  }
  return days
}

export function toPrismaDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function fromPrismaDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
