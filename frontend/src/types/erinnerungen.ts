// Typen für das Tool "Erinnerungen"

export type ReminderRecurrence = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM_INTERVAL' | 'WEEKDAYS'
export type IntervalUnit = 'DAY' | 'WEEK' | 'MONTH'

// Zusätzliche Vorab-Erinnerung vor dem eigentlichen Termin (nur bei ONCE),
// z.B. "6 Monate vorher: Hotel buchen". Unabhängig von startDate + times,
// die weiterhin den Termin selbst markieren.
export interface LeadReminder {
  offsetN: number
  offsetUnit: IntervalUnit
  time: string // "HH:MM"
}

export interface Reminder {
  id: string
  title: string
  note: string | null
  recurrence: ReminderRecurrence
  startDate: string // "YYYY-MM-DD"
  endDate: string | null
  intervalN: number | null
  intervalUnit: IntervalUnit | null
  weekdays: number[] | null // 0=So..6=Sa
  times: string[] // "HH:MM"
  leadReminders: LeadReminder[]
  active: boolean
  isTodo: boolean
  completed: boolean
  createdAt: string
  updatedAt: string
  nextOccurrence: string | null // "YYYY-MM-DD", nächster fälliger Tag ab heute
}

export interface ReminderInput {
  title: string
  note?: string | null
  recurrence: ReminderRecurrence
  startDate: string
  endDate?: string | null
  intervalN?: number | null
  intervalUnit?: IntervalUnit | null
  weekdays?: number[] | null
  times: string[]
  leadReminders?: LeadReminder[] | null
  active?: boolean
  isTodo?: boolean
  completed?: boolean
}

export interface Person {
  id: string
  firstName: string
  lastName: string | null
  birthday: string // "YYYY-MM-DD"
  photoUrl: string | null
  congratsCheckEnabled: boolean
  turningAge: number
  daysUntilBirthday: number
  congratulatedThisYear: boolean
}

export interface PersonInput {
  firstName: string
  lastName?: string | null
  birthday: string
  congratsCheckEnabled?: boolean
}
