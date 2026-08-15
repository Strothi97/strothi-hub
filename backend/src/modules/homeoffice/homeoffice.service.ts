import Holidays from 'date-holidays'
import { Bundesland, WorkDayStatus } from '@prisma/client'
import { prisma } from '../../db'
import {
  addDays,
  eachWeekdayInRange,
  fromPrismaDate,
  getMonday,
  parseISODate,
  toISODate,
  toPrismaDate,
} from './date-utils'

export interface ResolvedDay {
  date: string
  status: WorkDayStatus | null
  isAutoHoliday: boolean
}

interface StateHistoryEntry {
  state: Bundesland
  validFrom: string
}

// Feiertage pro (Bundesland, Jahr) werden einmal berechnet und wiederverwendet
// (date-holidays kann sonst pro Tagesprüfung teuer werden).
const holidayCache = new Map<string, Set<string>>()

function getHolidayDatesForYear(state: Bundesland, year: number): Set<string> {
  const cacheKey = `${state}-${year}`
  const cached = holidayCache.get(cacheKey)
  if (cached) return cached

  const hd = new Holidays('DE', state)
  const dates = new Set(
    hd
      .getHolidays(year)
      .filter((holiday) => holiday.type === 'public')
      .map((holiday) => holiday.date.slice(0, 10)),
  )
  holidayCache.set(cacheKey, dates)
  return dates
}

async function loadExplicitEntries(
  userId: string,
  fromIso: string,
  toIso: string,
): Promise<Map<string, WorkDayStatus>> {
  const rows = await prisma.workDayEntry.findMany({
    where: { userId, date: { gte: toPrismaDate(fromIso), lte: toPrismaDate(toIso) } },
  })
  return new Map(rows.map((row) => [fromPrismaDate(row.date), row.status]))
}

async function loadStateHistory(userId: string): Promise<StateHistoryEntry[]> {
  const rows = await prisma.userFederalState.findMany({
    where: { userId },
    orderBy: { validFrom: 'asc' },
  })
  return rows.map((row) => ({ state: row.state, validFrom: fromPrismaDate(row.validFrom) }))
}

function effectiveStateAt(history: StateHistoryEntry[], isoDate: string): Bundesland | null {
  let effective: Bundesland | null = null
  for (const entry of history) {
    if (entry.validFrom > isoDate) break
    effective = entry.state
  }
  return effective
}

function resolveStatusForDate(
  isoDate: string,
  explicitMap: Map<string, WorkDayStatus>,
  stateHistory: StateHistoryEntry[],
): { status: WorkDayStatus | null; isAutoHoliday: boolean } {
  const explicit = explicitMap.get(isoDate)
  if (explicit) {
    return { status: explicit, isAutoHoliday: false }
  }

  const state = effectiveStateAt(stateHistory, isoDate)
  if (state) {
    const year = Number(isoDate.slice(0, 4))
    if (getHolidayDatesForYear(state, year).has(isoDate)) {
      return { status: WorkDayStatus.PUBLIC_HOLIDAY, isAutoHoliday: true }
    }
  }

  return { status: null, isAutoHoliday: false }
}

// Gemeinsame Grundlage für Woche/Monat/Jahr: alle Werktage in [fromIso, toIso]
// mit aufgelöstem Status (explizite Eintragung oder automatischer Feiertag).
async function resolveRange(userId: string, fromIso: string, toIso: string): Promise<ResolvedDay[]> {
  const [explicitMap, stateHistory] = await Promise.all([
    loadExplicitEntries(userId, fromIso, toIso),
    loadStateHistory(userId),
  ])

  return eachWeekdayInRange(parseISODate(fromIso), parseISODate(toIso)).map((date) => {
    const isoDate = toISODate(date)
    return { date: isoDate, ...resolveStatusForDate(isoDate, explicitMap, stateHistory) }
  })
}

export async function getDay(userId: string, isoDate: string): Promise<ResolvedDay> {
  const [explicitMap, stateHistory] = await Promise.all([
    loadExplicitEntries(userId, isoDate, isoDate),
    loadStateHistory(userId),
  ])
  return { date: isoDate, ...resolveStatusForDate(isoDate, explicitMap, stateHistory) }
}

export async function setDay(userId: string, isoDate: string, status: WorkDayStatus | null) {
  const date = toPrismaDate(isoDate)
  if (status === null) {
    await prisma.workDayEntry.deleteMany({ where: { userId, date } })
    return
  }
  await prisma.workDayEntry.upsert({
    where: { userId_date: { userId, date } },
    update: { status },
    create: { userId, date, status },
  })
}

export async function getWeek(userId: string, referenceIsoDate: string) {
  const monday = getMonday(parseISODate(referenceIsoDate))
  const friday = addDays(monday, 4)
  const fromIso = toISODate(monday)
  const toIso = toISODate(friday)

  const days = await resolveRange(userId, fromIso, toIso)
  return { weekStart: fromIso, weekEnd: toIso, days }
}

// month: 1–12
export async function getMonth(userId: string, year: number, month: number) {
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0) // Tag 0 des Folgemonats = letzter Tag dieses Monats
  const fromIso = toISODate(first)
  const toIso = toISODate(last)

  const days = await resolveRange(userId, fromIso, toIso)
  return { monthStart: fromIso, monthEnd: toIso, days }
}

export async function getYearAggregation(userId: string, year: number) {
  const fromIso = `${year}-01-01`
  const toIso = `${year}-12-31`

  const [days, adjustments] = await Promise.all([
    resolveRange(userId, fromIso, toIso),
    prisma.vacationAdjustment.findMany({ where: { userId, year }, orderBy: { createdAt: 'asc' } }),
  ])

  const counts: Record<WorkDayStatus, number> = {
    OFFICE: 0,
    HOME_OFFICE: 0,
    HOLIDAY: 0,
    PUBLIC_HOLIDAY: 0,
    SICK: 0,
  }

  for (const day of days) {
    if (day.status) counts[day.status] += 1
  }

  const adjustmentTotal = adjustments.reduce((sum, adjustment) => sum + adjustment.amount, 0)

  return {
    year,
    counts,
    totalWorkdays: days.length,
    adjustments,
    adjustmentTotal,
    effectiveHolidayDays: counts.HOLIDAY + adjustmentTotal,
    days,
  }
}

export const listAdjustments = (userId: string, year: number) =>
  prisma.vacationAdjustment.findMany({ where: { userId, year }, orderBy: { createdAt: 'asc' } })

export const createAdjustment = (userId: string, data: { year: number; amount: number; reason: string }) =>
  prisma.vacationAdjustment.create({ data: { userId, ...data } })

export const deleteAdjustment = (userId: string, id: string) =>
  prisma.vacationAdjustment.deleteMany({ where: { id, userId } })

export async function listStates(userId: string) {
  const rows = await prisma.userFederalState.findMany({
    where: { userId },
    orderBy: { validFrom: 'asc' },
  })
  return rows.map((row) => ({ id: row.id, state: row.state, validFrom: fromPrismaDate(row.validFrom) }))
}

export async function addState(userId: string, data: { state: Bundesland; validFrom: string }) {
  const row = await prisma.userFederalState.create({
    data: { userId, state: data.state, validFrom: toPrismaDate(data.validFrom) },
  })
  return { id: row.id, state: row.state, validFrom: fromPrismaDate(row.validFrom) }
}

export const deleteState = (userId: string, id: string) =>
  prisma.userFederalState.deleteMany({ where: { id, userId } })
