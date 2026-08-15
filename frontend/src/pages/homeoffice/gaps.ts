import type { ResolvedDay } from '@app-types/homeoffice'
import { MONTH_NAMES, WEEKDAY_NAMES_FULL, getMonday, parseISODate, toISODate } from './constants'

export interface MonthGap {
  key: string
  label: string
}

export interface WeekGap {
  key: string
  label: string
}

export interface DayGap {
  key: string
  label: string
}

export interface GapReport {
  months: MonthGap[]
  weeks: WeekGap[]
  days: DayGap[]
}

function formatShort(isoDate: string): string {
  const [, month, day] = isoDate.split('-')
  return `${day}.${month}.`
}

function formatFull(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  const weekday = WEEKDAY_NAMES_FULL[parseISODate(isoDate).getDay()]
  return `${weekday}, ${day}.${month}.${year}`
}

// Findet fehlende Einträge bis (ausschließlich) `todayIso`, aggregiert nach
// der größtmöglichen sinnvollen Granularität: ist ein ganzer Monat leer, wird
// nur der Monat gemeldet (nicht 20+ Einzeltage); ist danach noch eine ganze
// Woche leer, wird die Woche gemeldet; übrig bleiben echte Einzeltage (z.B.
// "den einen Freitag vergessen"). Automatisch erkannte Feiertage zählen nicht
// als Lücke, da sie bereits einen Status haben.
export function findGaps(days: ResolvedDay[], todayIso: string): GapReport {
  const inScope = days.filter((day) => day.date < todayIso)
  const missing = new Set(inScope.filter((day) => day.status === null).map((day) => day.date))
  const handled = new Set<string>()

  const months: MonthGap[] = []
  const byMonth = new Map<string, ResolvedDay[]>()
  for (const day of inScope) {
    const key = day.date.slice(0, 7) // YYYY-MM
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key)!.push(day)
  }
  for (const [key, monthDays] of byMonth) {
    if (monthDays.every((day) => missing.has(day.date))) {
      const [year, month] = key.split('-')
      months.push({ key, label: `${MONTH_NAMES[Number(month) - 1]} ${year}` })
      monthDays.forEach((day) => handled.add(day.date))
    }
  }

  const weeks: WeekGap[] = []
  const byWeek = new Map<string, ResolvedDay[]>()
  for (const day of inScope) {
    if (handled.has(day.date)) continue
    const weekKey = toISODate(getMonday(parseISODate(day.date)))
    if (!byWeek.has(weekKey)) byWeek.set(weekKey, [])
    byWeek.get(weekKey)!.push(day)
  }
  for (const [weekKey, weekDays] of byWeek) {
    if (weekDays.every((day) => missing.has(day.date))) {
      const sorted = [...weekDays].sort((a, b) => a.date.localeCompare(b.date))
      weeks.push({
        key: weekKey,
        label: `Woche ${formatShort(sorted[0].date)} – ${formatShort(sorted[sorted.length - 1].date)}`,
      })
      weekDays.forEach((day) => handled.add(day.date))
    }
  }

  const dayGaps: DayGap[] = inScope
    .filter((day) => !handled.has(day.date) && missing.has(day.date))
    .map((day) => ({ key: day.date, label: formatFull(day.date) }))

  return { months, weeks, days: dayGaps }
}
