import type { IntervalUnit, Reminder, ReminderRecurrence } from '@app-types/erinnerungen'

export const RECURRENCE_LABELS: Record<ReminderRecurrence, string> = {
  ONCE: 'Einmalig',
  DAILY: 'Täglich',
  WEEKLY: 'Wöchentlich',
  MONTHLY: 'Monatlich',
  YEARLY: 'Jährlich',
  CUSTOM_INTERVAL: 'Freies Intervall',
  WEEKDAYS: 'Wochentage',
}
export const RECURRENCE_ORDER: ReminderRecurrence[] = [
  'ONCE',
  'DAILY',
  'WEEKLY',
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
    case 'WEEKLY':
      return 'wöchentlich'
    case 'MONTHLY':
      return 'monatlich'
    case 'YEARLY':
      return 'jährlich'
    case 'CUSTOM_INTERVAL':
      return `alle ${reminder.intervalN} ${INTERVAL_UNIT_LABELS[reminder.intervalUnit ?? 'MONTH']}`
    case 'WEEKDAYS':
      return (reminder.weekdays ?? []).map((d) => WEEKDAY_LABELS[d]).join(', ')
    default:
      return ''
  }
}
