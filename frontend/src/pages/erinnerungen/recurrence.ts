import type { IntervalUnit, LeadReminder, Reminder, ReminderRecurrence } from '@app-types/erinnerungen'

// WEEKLY ist als Auswahloption zusammengelegt mit WEEKDAYS (funktional
// identisch: WEEKLY ist WEEKDAYS mit genau einem, aus startDate abgeleiteten
// Tag) — WEEKLY bleibt im Typ/Backend-Enum für Altbestand, wird von der App
// aber nicht mehr neu vergeben (siehe Migration 20260903101334). Label bleibt
// als Fallback bestehen, RECURRENCE_ORDER (Picker-Reihenfolge) lässt es aus.
export const RECURRENCE_LABELS: Record<ReminderRecurrence, string> = {
  ONCE: 'Einmalig',
  DAILY: 'Täglich',
  WEEKLY: 'Wöchentlich',
  MONTHLY: 'Monatlich',
  YEARLY: 'Jährlich',
  CUSTOM_INTERVAL: 'Freies Intervall',
  WEEKDAYS: 'Wöchentlich',
}
export const RECURRENCE_ORDER: ReminderRecurrence[] = [
  'ONCE',
  'DAILY',
  'MONTHLY',
  'YEARLY',
  'CUSTOM_INTERVAL',
  'WEEKDAYS',
]

export const INTERVAL_UNIT_LABELS: Record<IntervalUnit, string> = {
  DAY: 'Tage',
  WEEK: 'Wochen',
  MONTH: 'Monate',
}
export const INTERVAL_UNIT_ORDER: IntervalUnit[] = ['DAY', 'WEEK', 'MONTH']

// Index entspricht Date.getDay() (0=So .. 6=Sa)
export const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('de-DE')
}

export function describeRecurrence(reminder: Reminder): string {
  switch (reminder.recurrence) {
    case 'ONCE':
      return `am ${formatDate(reminder.startDate)}`
    case 'DAILY':
      return 'täglich'
    case 'MONTHLY':
      return 'monatlich'
    case 'YEARLY':
      return 'jährlich'
    case 'CUSTOM_INTERVAL':
      return `alle ${reminder.intervalN} ${INTERVAL_UNIT_LABELS[reminder.intervalUnit ?? 'MONTH']}`
    case 'WEEKLY':
      // Altbestand vor der Zusammenlegung mit WEEKDAYS (siehe RECURRENCE_ORDER
      // oben) — sollte nach der Migration nicht mehr vorkommen, defensiv aber
      // genau wie WEEKDAYS über den (bei WEEKLY ungesetzten) startDate-Tag anzeigen.
      return WEEKDAY_LABELS[new Date(`${reminder.startDate}T00:00:00`).getDay()]
    case 'WEEKDAYS':
      return (reminder.weekdays ?? []).map((d) => WEEKDAY_LABELS[d]).join(', ')
    default:
      return ''
  }
}

// Beschriftung für eine einzelne Vorab-Erinnerung, z.B. "6 Monate vorher".
export function describeLeadOffset(lead: LeadReminder): string {
  if (lead.offsetN === 0) return 'am Tag selbst'
  return `${lead.offsetN} ${INTERVAL_UNIT_LABELS[lead.offsetUnit]} vorher`
}

// Date.getDay() (0=So..6=Sa) auf eine Mo-zuerst-Reihenfolge abgebildet
// (Mo=0 .. So=6) — für eine vom heutigen Datum unabhängige Sortierung.
function mondayFirstWeekday(day: number): number {
  return (day + 6) % 7
}

// Sortierschlüssel für die "Häufigkeit"-Gruppierung: innerhalb derselben
// Wiederholungsart soll stets Mo→So gelten (bei WEEKDAYS der früheste
// gewählte Tag), statt der Erstellungsreihenfolge. Zweites Kriterium ist
// die früheste Uhrzeit (siehe timeSortKey unten).
export function weekdaySortKey(reminder: Reminder): number {
  if (reminder.recurrence === 'DAILY') return 0 // feuert jeden Tag, kein Wochentag unterscheidet hier
  if (reminder.recurrence === 'WEEKDAYS') {
    const days = reminder.weekdays ?? []
    if (days.length === 0) return 7
    return Math.min(...days.map(mondayFirstWeekday))
  }
  const startDay = new Date(`${reminder.startDate}T00:00:00`).getDay()
  return mondayFirstWeekday(startDay)
}

// Früheste Uhrzeit einer Erinnerung, für 00:00 → 23:59-Sortierung.
export function timeSortKey(reminder: Reminder): string {
  return [...reminder.times].sort()[0] ?? ''
}
