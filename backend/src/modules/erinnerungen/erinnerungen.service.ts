import { ReminderRecurrence, IntervalUnit } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { prisma } from '../../db'

// ── Datums-Helfer (UTC-basiert, ohne neue Bibliothek) ───

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  const utcA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())
  const utcB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())
  return Math.round((utcB - utcA) / msPerDay)
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

// Prisma-@db.Date-Felder als reines "YYYY-MM-DD" ausgeben, nicht als
// vollen ISO-Zeitstempel (Express' res.json() würde sonst automatisch
// Date.toISOString() aufrufen — das bricht <input type="date">-Bindungen
// und Datums-Parsing im Frontend).
function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// ── Wiederholungs-Logik ──────────────────────────────────

interface RecurrenceInput {
  recurrence: ReminderRecurrence
  startDate: Date
  endDate: Date | null
  intervalN: number | null
  intervalUnit: IntervalUnit | null
  weekdays: unknown
}

// Prüft, ob eine Erinnerung an einem bestimmten (kalendarischen) Tag fällig ist.
export function isDueOn(reminder: RecurrenceInput, date: Date): boolean {
  const diffDays = daysBetween(reminder.startDate, date)
  if (diffDays < 0) return false
  if (reminder.endDate && daysBetween(reminder.endDate, date) > 0) return false

  switch (reminder.recurrence) {
    case 'ONCE':
      return diffDays === 0
    case 'DAILY':
      return true
    case 'WEEKLY':
      return diffDays % 7 === 0
    case 'MONTHLY': {
      const startDay = reminder.startDate.getUTCDate()
      const targetLastDay = lastDayOfMonth(date.getUTCFullYear(), date.getUTCMonth())
      return date.getUTCDate() === Math.min(startDay, targetLastDay)
    }
    case 'YEARLY': {
      const startMonth = reminder.startDate.getUTCMonth()
      const startDay = reminder.startDate.getUTCDate()
      const targetLastDay = lastDayOfMonth(date.getUTCFullYear(), startMonth)
      return date.getUTCMonth() === startMonth && date.getUTCDate() === Math.min(startDay, targetLastDay)
    }
    case 'CUSTOM_INTERVAL': {
      if (!reminder.intervalN || reminder.intervalN < 1) return false
      if (reminder.intervalUnit === 'DAY') return diffDays % reminder.intervalN === 0
      if (reminder.intervalUnit === 'WEEK') return diffDays % (reminder.intervalN * 7) === 0
      if (reminder.intervalUnit === 'MONTH') {
        const startY = reminder.startDate.getUTCFullYear()
        const startM = reminder.startDate.getUTCMonth()
        const monthDiff = (date.getUTCFullYear() - startY) * 12 + (date.getUTCMonth() - startM)
        if (monthDiff < 0 || monthDiff % reminder.intervalN !== 0) return false
        const startDay = reminder.startDate.getUTCDate()
        const targetLastDay = lastDayOfMonth(date.getUTCFullYear(), date.getUTCMonth())
        return date.getUTCDate() === Math.min(startDay, targetLastDay)
      }
      return false
    }
    case 'WEEKDAYS': {
      const weekdays = Array.isArray(reminder.weekdays) ? (reminder.weekdays as number[]) : []
      return weekdays.includes(date.getUTCDay())
    }
    default:
      return false
  }
}

// Nächster fälliger Tag einer Erinnerung ab (inkl.) heute — für Sortierung
// in der Liste ("was steht als Nächstes an"). Brute-force statt pro Typ
// eigene Formel: robust gegenüber allen Wiederholungsarten (inkl. endDate),
// bei der kleinen Datenmenge eines persönlichen Erinnerungs-Sets vernachlässigbar.
const MAX_LOOKAHEAD_DAYS = 366 * 2

function nextReminderOccurrence(reminder: RecurrenceInput, today: Date): Date | null {
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  for (let i = 0; i <= MAX_LOOKAHEAD_DAYS; i++) {
    const candidate = new Date(todayUtc.getTime() + i * 24 * 60 * 60 * 1000)
    if (isDueOn(reminder, candidate)) return candidate
  }
  return null
}

// Nächstes Vorkommen eines Geburtstags ab (inkl.) heute — für Sortierung/Anzeige.
function nextBirthdayOccurrence(birthday: Date, today: Date): Date {
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const month = birthday.getUTCMonth()
  const rawDay = birthday.getUTCDate()

  const buildFor = (year: number) => {
    const day = month === 1 && rawDay === 29 && !isLeapYear(year) ? 28 : rawDay
    return new Date(Date.UTC(year, month, day))
  }

  let candidate = buildFor(todayUtc.getUTCFullYear())
  if (candidate < todayUtc) candidate = buildFor(todayUtc.getUTCFullYear() + 1)
  return candidate
}

// ── Reminders ────────────────────────────────────────────

export interface ReminderDTO {
  id: string
  title: string
  note: string | null
  recurrence: ReminderRecurrence
  startDate: string
  endDate: string | null
  intervalN: number | null
  intervalUnit: IntervalUnit | null
  weekdays: number[] | null
  times: string[]
  active: boolean
  isTodo: boolean
  completed: boolean
  createdAt: Date
  updatedAt: Date
  // Nächster fälliger Kalendertag ab heute (oder null, falls z.B. endDate
  // in der Vergangenheit liegt) — für die "Nächstes Datum"-Sortierung.
  nextOccurrence: string | null
}

function toReminderDTO(row: {
  id: string
  title: string
  note: string | null
  recurrence: ReminderRecurrence
  startDate: Date
  endDate: Date | null
  intervalN: number | null
  intervalUnit: IntervalUnit | null
  weekdays: unknown
  times: unknown
  active: boolean
  isTodo: boolean
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): ReminderDTO {
  const weekdays = Array.isArray(row.weekdays) ? (row.weekdays as number[]) : null
  const nextOccurrence = nextReminderOccurrence(
    { recurrence: row.recurrence, startDate: row.startDate, endDate: row.endDate, intervalN: row.intervalN, intervalUnit: row.intervalUnit, weekdays },
    new Date(),
  )

  return {
    id: row.id,
    title: row.title,
    note: row.note,
    recurrence: row.recurrence,
    startDate: toDateOnly(row.startDate),
    endDate: row.endDate ? toDateOnly(row.endDate) : null,
    intervalN: row.intervalN,
    intervalUnit: row.intervalUnit,
    weekdays,
    times: Array.isArray(row.times) ? (row.times as string[]) : [],
    active: row.active,
    isTodo: row.isTodo,
    completed: row.completedAt !== null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    nextOccurrence: nextOccurrence ? toDateOnly(nextOccurrence) : null,
  }
}

export async function listReminders(userId: string): Promise<ReminderDTO[]> {
  const rows = await prisma.reminder.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  return rows.map(toReminderDTO)
}

export interface ReminderInput {
  title: string
  note?: string | null
  recurrence: ReminderRecurrence
  startDate: string // "YYYY-MM-DD"
  endDate?: string | null
  intervalN?: number | null
  intervalUnit?: IntervalUnit | null
  weekdays?: number[] | null
  times: string[]
  active?: boolean
  isTodo?: boolean
  completed?: boolean
}

export async function createReminder(userId: string, input: ReminderInput): Promise<ReminderDTO> {
  const row = await prisma.reminder.create({
    data: {
      userId,
      title: input.title,
      note: input.note || null,
      recurrence: input.recurrence,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      intervalN: input.intervalN ?? null,
      intervalUnit: input.intervalUnit ?? null,
      weekdays: input.weekdays ?? undefined,
      times: input.times,
      active: input.active ?? true,
      isTodo: input.isTodo ?? false,
      completedAt: input.completed ? new Date() : null,
    },
  })
  return toReminderDTO(row)
}

export async function updateReminder(
  userId: string,
  id: string,
  input: Partial<ReminderInput>,
): Promise<ReminderDTO | null> {
  const existing = await prisma.reminder.findFirst({ where: { id, userId } })
  if (!existing) return null

  const row = await prisma.reminder.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.note !== undefined && { note: input.note || null }),
      ...(input.recurrence !== undefined && { recurrence: input.recurrence }),
      ...(input.startDate !== undefined && { startDate: new Date(input.startDate) }),
      ...(input.endDate !== undefined && { endDate: input.endDate ? new Date(input.endDate) : null }),
      ...(input.intervalN !== undefined && { intervalN: input.intervalN }),
      ...(input.intervalUnit !== undefined && { intervalUnit: input.intervalUnit }),
      ...(input.weekdays !== undefined && { weekdays: input.weekdays ?? undefined }),
      ...(input.times !== undefined && { times: input.times }),
      ...(input.active !== undefined && { active: input.active }),
      ...(input.isTodo !== undefined && { isTodo: input.isTodo }),
      ...(input.completed !== undefined && { completedAt: input.completed ? new Date() : null }),
    },
  })
  return toReminderDTO(row)
}

export async function deleteReminder(userId: string, id: string): Promise<boolean> {
  const result = await prisma.reminder.deleteMany({ where: { id, userId } })
  return result.count > 0
}

// ── Geburtstage (Person) ─────────────────────────────────

export interface PersonDTO {
  id: string
  firstName: string
  lastName: string | null
  birthday: string
  photoUrl: string | null
  congratsCheckEnabled: boolean
  turningAge: number
  daysUntilBirthday: number
  congratulatedThisYear: boolean
}

export async function listPeople(userId: string): Promise<PersonDTO[]> {
  const today = new Date()
  const currentYear = today.getUTCFullYear()

  const rows = await prisma.person.findMany({
    where: { userId },
    include: { congratsLog: { where: { year: currentYear } } },
    orderBy: { firstName: 'asc' },
  })

  return rows.map((row) => {
    const next = nextBirthdayOccurrence(row.birthday, today)
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      birthday: toDateOnly(row.birthday),
      photoUrl: row.photoUrl,
      congratsCheckEnabled: row.congratsCheckEnabled,
      turningAge: next.getUTCFullYear() - row.birthday.getUTCFullYear(),
      daysUntilBirthday: daysBetween(today, next),
      congratulatedThisYear: row.congratsLog.some((log) => log.congratulated),
    }
  })
}

export interface PersonInput {
  firstName: string
  lastName?: string | null
  birthday: string // "YYYY-MM-DD"
  congratsCheckEnabled?: boolean
}

export async function createPerson(userId: string, input: PersonInput) {
  return prisma.person.create({
    data: {
      userId,
      firstName: input.firstName,
      lastName: input.lastName || null,
      birthday: new Date(input.birthday),
      congratsCheckEnabled: input.congratsCheckEnabled ?? true,
    },
  })
}

export async function updatePerson(userId: string, id: string, input: Partial<PersonInput>) {
  const existing = await prisma.person.findFirst({ where: { id, userId } })
  if (!existing) return null

  return prisma.person.update({
    where: { id },
    data: {
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName || null }),
      ...(input.birthday !== undefined && { birthday: new Date(input.birthday) }),
      ...(input.congratsCheckEnabled !== undefined && { congratsCheckEnabled: input.congratsCheckEnabled }),
    },
  })
}

export async function deletePerson(userId: string, id: string): Promise<boolean> {
  const result = await prisma.person.deleteMany({ where: { id, userId } })
  return result.count > 0
}

// Uploads liegen pro Tool und pro Nutzer getrennt (nicht alles lose unter
// /uploads), damit das bei mehr Tools/Nutzern übersichtlich bleibt.
const UPLOADS_BASE = path.join(__dirname, '..', '..', '..', process.env.UPLOAD_DIR || 'uploads')
const PHOTO_UPLOAD_ROOT = path.join(UPLOADS_BASE, 'erinnerungen')

// Wandelt das hochgeladene Bild in ein komprimiertes, quadratisches WebP
// um (kleiner & web-optimiert, passt zur runden Foto-Anzeige) und legt es
// unter /uploads/erinnerungen/<userId>/ ab. Ein vorheriges Foto derselben
// Person wird entfernt, damit sich keine verwaisten Dateien ansammeln.
export async function savePersonPhoto(userId: string, id: string, buffer: Buffer) {
  const existing = await prisma.person.findFirst({ where: { id, userId } })
  if (!existing) return null

  const userDir = path.join(PHOTO_UPLOAD_ROOT, userId)
  await fs.mkdir(userDir, { recursive: true })

  const filename = `${id}-${Date.now()}.webp`
  await sharp(buffer)
    .resize(512, 512, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(path.join(userDir, filename))

  if (existing.photoUrl) {
    const oldPath = path.join(UPLOADS_BASE, existing.photoUrl.replace(/^\/uploads\//, ''))
    await fs.unlink(oldPath).catch(() => {})
  }

  const photoUrl = `/uploads/erinnerungen/${userId}/${filename}`
  return prisma.person.update({ where: { id }, data: { photoUrl } })
}

export async function setCongrats(
  userId: string,
  personId: string,
  year: number,
  congratulated: boolean,
) {
  const person = await prisma.person.findFirst({ where: { id: personId, userId } })
  if (!person) return null

  return prisma.personCongratsLog.upsert({
    where: { personId_year: { personId, year } },
    create: { personId, year, congratulated, respondedAt: new Date() },
    update: { congratulated, respondedAt: new Date() },
  })
}
