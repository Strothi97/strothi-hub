import { FarsiWordType, FarsiStudyMode } from '@prisma/client'
import { prisma } from '../../db'

export interface FarsiEntryDTO {
  id: string
  german: string[]
  persianLatin: string[]
  persianScript: string | null
  type: FarsiWordType | null
  meaning: string | null
  isComplete: boolean
  missingFields: string[]
  createdAt: Date
  updatedAt: Date
  // Aktuelle Leitner-Stufe im Modus VOCAB, falls schon geübt — nur von
  // listEntries befüllt (kleine Anzeige im Wörterbuch), sonst null.
  vocabBox: number | null
}

interface RawEntry {
  id: string
  german: unknown
  persianLatin: unknown
  persianScript: string | null
  type: FarsiWordType | null
  meaning: string | null
  createdAt: Date
  updatedAt: Date
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '')
  }
  if (typeof value === 'string' && value.trim() !== '') return [value]
  return []
}

function computeCompleteness(german: string[], persianLatin: string[], persianScript: string | null, type: FarsiWordType | null) {
  const missingFields: string[] = []
  if (german.length === 0) missingFields.push('german')
  if (persianLatin.length === 0) missingFields.push('persianLatin')
  if (!persianScript) missingFields.push('persianScript')
  if (!type) missingFields.push('type')
  return { isComplete: missingFields.length === 0, missingFields }
}

function toDTO(row: RawEntry, vocabBox: number | null = null): FarsiEntryDTO {
  const german = toStringArray(row.german)
  const persianLatin = toStringArray(row.persianLatin)
  const { isComplete, missingFields } = computeCompleteness(german, persianLatin, row.persianScript, row.type)

  return {
    id: row.id,
    german,
    persianLatin,
    persianScript: row.persianScript,
    type: row.type,
    meaning: row.meaning,
    isComplete,
    missingFields,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    vocabBox,
  }
}

interface ListFilters {
  search?: string
  type?: FarsiWordType
  onlyIncomplete?: boolean
}

// Die Datenmenge eines persönlichen Vokabelhefts ist klein — Suche/Filter
// laufen bewusst in JS statt per SQL/JSON-Query, da MySQL über Prisma
// "Substring in einem Array-Element" nicht sauber unterstützt.
export async function listEntries(userId: string, filters: ListFilters): Promise<FarsiEntryDTO[]> {
  const [rows, progressRows] = await Promise.all([
    prisma.farsiEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.farsiProgress.findMany({ where: { userId, mode: 'VOCAB' } }),
  ])
  const vocabBoxByEntryId = new Map(progressRows.map((p) => [p.entryId, p.box]))

  let entries = rows.map((row) => toDTO(row, vocabBoxByEntryId.get(row.id) ?? null))

  if (filters.type) {
    entries = entries.filter((entry) => entry.type === filters.type)
  }

  if (filters.onlyIncomplete) {
    entries = entries.filter((entry) => !entry.isComplete)
  }

  const needle = filters.search?.trim().toLowerCase()
  if (needle) {
    entries = entries.filter((entry) => {
      const haystack = [...entry.german, ...entry.persianLatin, entry.persianScript ?? '']
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }

  return entries
}

export async function getEntry(userId: string, id: string): Promise<FarsiEntryDTO | null> {
  const row = await prisma.farsiEntry.findFirst({ where: { id, userId } })
  return row ? toDTO(row) : null
}

interface EntryInput {
  german?: unknown
  persianLatin?: unknown
  persianScript?: string | null
  type?: FarsiWordType | null
  meaning?: string | null
}

export async function createEntry(userId: string, input: EntryInput): Promise<FarsiEntryDTO> {
  const row = await prisma.farsiEntry.create({
    data: {
      userId,
      german: toStringArray(input.german),
      persianLatin: toStringArray(input.persianLatin),
      persianScript: input.persianScript || null,
      type: input.type || null,
      meaning: input.meaning || null,
    },
  })
  return toDTO(row)
}

export async function updateEntry(
  userId: string,
  id: string,
  input: EntryInput,
): Promise<FarsiEntryDTO | null> {
  const existing = await prisma.farsiEntry.findFirst({ where: { id, userId } })
  if (!existing) return null

  const row = await prisma.farsiEntry.update({
    where: { id },
    data: {
      ...(input.german !== undefined && { german: toStringArray(input.german) }),
      ...(input.persianLatin !== undefined && { persianLatin: toStringArray(input.persianLatin) }),
      ...(input.persianScript !== undefined && { persianScript: input.persianScript || null }),
      ...(input.type !== undefined && { type: input.type || null }),
      ...(input.meaning !== undefined && { meaning: input.meaning || null }),
    },
  })
  return toDTO(row)
}

export async function deleteEntry(userId: string, id: string): Promise<boolean> {
  const result = await prisma.farsiEntry.deleteMany({ where: { id, userId } })
  return result.count > 0
}

// ── Import ──────────────────────────────────────────────

interface RawImportEntry {
  deutsch?: unknown
  persich?: unknown
  bedeutung?: unknown
}

interface ImportError {
  index: number
  reason: string
}

// Übernimmt das bestehende JSON-Format des Nutzers (deutsch/persich/bedeutung)
// unverändert — kein Versuch, beschädigte Zeichenkodierung zu "raten".
// type/persianScript bleiben leer und machen den Eintrag automatisch als
// unvollständig sichtbar, bis er manuell im Wörterbuch ergänzt wird.
export async function importEntries(
  userId: string,
  rawEntries: unknown,
): Promise<{ imported: number; errors: ImportError[] }> {
  if (!Array.isArray(rawEntries)) {
    return { imported: 0, errors: [{ index: -1, reason: 'Erwartet wurde ein JSON-Array von Einträgen.' }] }
  }

  const errors: ImportError[] = []
  const toCreate: { userId: string; german: string[]; persianLatin: string[]; meaning: string | null }[] = []

  rawEntries.forEach((raw, index) => {
    if (typeof raw !== 'object' || raw === null) {
      errors.push({ index, reason: 'Kein gültiges Objekt.' })
      return
    }
    const entry = raw as RawImportEntry
    const german = toStringArray(entry.deutsch)
    const persianLatin = toStringArray(entry.persich)
    if (german.length === 0 && persianLatin.length === 0) {
      errors.push({ index, reason: 'Weder "deutsch" noch "persich" vorhanden.' })
      return
    }
    toCreate.push({
      userId,
      german,
      persianLatin,
      meaning: typeof entry.bedeutung === 'string' && entry.bedeutung.trim() !== '' ? entry.bedeutung : null,
    })
  })

  if (toCreate.length > 0) {
    await prisma.farsiEntry.createMany({ data: toCreate })
  }

  return { imported: toCreate.length, errors }
}

// ── Study / Leitner-Box ────────────────────────────────

// Ab Box 6 flacht die Verdopplung auf menschlich sinnvolle Abstände ab,
// statt weiter zu verdoppeln (das würde viel zu schnell über ein Jahr
// springen) — verinnerlichte Begriffe landen so bei 1-2× jährlicher
// Wiederholung statt völlig aus der Rotation zu verschwinden.
const BOX_INTERVAL_DAYS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
  6: 30,
  7: 90,
  8: 180,
  9: 365,
}
const MAX_BOX = 9
const DEFAULT_SESSION_SIZE = 10
const MAX_SESSION_SIZE = 50

export interface StudySessionDTO {
  dueCount: number
  ineligibleCount: number
  cards: FarsiEntryDTO[]
}

// Fisher-Yates — mischt in-place und gibt das Array zurück.
function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

function isStudyEligible(entry: FarsiEntryDTO, mode: FarsiStudyMode): boolean {
  if (mode === 'VOCAB') {
    return entry.german.length > 0 && (entry.persianLatin.length > 0 || !!entry.persianScript)
  }
  // SCRIPT: Lautschrift und Originalschrift müssen beide vorhanden sein,
  // sonst gibt es nichts, das die beiden Seiten der Karte füllen könnte.
  return entry.persianLatin.length > 0 && !!entry.persianScript
}

// Fortschritt wird pro (userId, entryId, mode) getrennt geführt — Bedeutungs-
// und Schrift-Erkennung sind unterschiedliche Fähigkeiten mit eigenem Takt.
export async function getStudySession(
  userId: string,
  mode: FarsiStudyMode,
  limit = DEFAULT_SESSION_SIZE,
): Promise<StudySessionDTO> {
  const [rows, progressRows] = await Promise.all([
    prisma.farsiEntry.findMany({ where: { userId } }),
    prisma.farsiProgress.findMany({ where: { userId, mode } }),
  ])

  const progressByEntryId = new Map(progressRows.map((p) => [p.entryId, p]))
  const entries = rows.map(toDTO)

  const eligible = entries.filter((entry) => isStudyEligible(entry, mode))
  const ineligibleCount = entries.length - eligible.length

  const now = Date.now()
  const due = eligible.filter((entry) => {
    const progress = progressByEntryId.get(entry.id)
    return !progress || progress.dueAt.getTime() <= now
  })

  // Erst mischen, dann stabil nach Fälligkeit sortieren — echte
  // Überfällige bleiben vorn, aber unter gleich fälligen (typischerweise
  // "noch nie geübt") ist die Reihenfolge bei jeder Sitzung neu zufällig,
  // statt immer in derselben (z.B. Anlage-)Reihenfolge zu erscheinen.
  shuffle(due)
  due.sort((a, b) => {
    const aDue = progressByEntryId.get(a.id)?.dueAt.getTime() ?? -Infinity
    const bDue = progressByEntryId.get(b.id)?.dueAt.getTime() ?? -Infinity
    return aDue - bDue
  })

  const cappedLimit = Math.min(Math.max(limit, 1), MAX_SESSION_SIZE)

  return {
    dueCount: due.length,
    ineligibleCount,
    cards: due.slice(0, cappedLimit),
  }
}

export async function reviewCard(
  userId: string,
  entryId: string,
  mode: FarsiStudyMode,
  correct: boolean,
): Promise<{ box: number; dueAt: Date } | null> {
  const entry = await prisma.farsiEntry.findFirst({ where: { id: entryId, userId } })
  if (!entry) return null

  const existing = await prisma.farsiProgress.findUnique({
    where: { userId_entryId_mode: { userId, entryId, mode } },
  })

  const currentBox = existing?.box ?? 1
  const newBox = correct ? Math.min(currentBox + 1, MAX_BOX) : 1
  const dueAt = new Date(Date.now() + BOX_INTERVAL_DAYS[newBox] * 24 * 60 * 60 * 1000)
  const now = new Date()

  await prisma.farsiProgress.upsert({
    where: { userId_entryId_mode: { userId, entryId, mode } },
    create: { userId, entryId, mode, box: newBox, dueAt, lastReviewedAt: now },
    update: { box: newBox, dueAt, lastReviewedAt: now },
  })

  return { box: newBox, dueAt }
}

export interface BoxStatsDTO {
  eligibleCount: number
  ineligibleCount: number
  newCount: number // geeignet, aber noch nie geübt
  byBox: Record<number, number> // Box 1-9 -> Anzahl Einträge in dieser Stufe
}

export async function getBoxStats(userId: string, mode: FarsiStudyMode): Promise<BoxStatsDTO> {
  const [rows, progressRows] = await Promise.all([
    prisma.farsiEntry.findMany({ where: { userId } }),
    prisma.farsiProgress.findMany({ where: { userId, mode } }),
  ])

  const progressByEntryId = new Map(progressRows.map((p) => [p.entryId, p]))
  const entries = rows.map(toDTO)
  const eligible = entries.filter((entry) => isStudyEligible(entry, mode))
  const ineligibleCount = entries.length - eligible.length

  const byBox: Record<number, number> = {}
  for (let box = 1; box <= MAX_BOX; box++) byBox[box] = 0

  let newCount = 0
  for (const entry of eligible) {
    const progress = progressByEntryId.get(entry.id)
    if (!progress) {
      newCount++
      continue
    }
    byBox[progress.box] += 1
  }

  return { eligibleCount: eligible.length, ineligibleCount, newCount, byBox }
}

// ── Buchstaben-Lernen ──────────────────────────────────

// Buchstaben sind keine FarsiEntry-Zeilen, sondern eine statische Liste
// im Frontend (alphabet.ts). Das Backend kennt nur Fortschritts-Zeilen
// zu beliebigen letterChar-Strings — Eignung/Fälligkeit wird deshalb
// clientseitig berechnet, nicht hier.

export interface LetterProgressDTO {
  letterChar: string
  position: string
  box: number
  dueAt: Date
  lastReviewedAt: Date | null
}

export async function getLetterProgress(userId: string): Promise<LetterProgressDTO[]> {
  const rows = await prisma.farsiLetterProgress.findMany({ where: { userId } })
  return rows.map((row) => ({
    letterChar: row.letterChar,
    position: row.position,
    box: row.box,
    dueAt: row.dueAt,
    lastReviewedAt: row.lastReviewedAt,
  }))
}

export async function reviewLetter(
  userId: string,
  letterChar: string,
  position: string,
  correct: boolean,
): Promise<{ box: number; dueAt: Date }> {
  const existing = await prisma.farsiLetterProgress.findUnique({
    where: { userId_letterChar_position: { userId, letterChar, position } },
  })

  const currentBox = existing?.box ?? 1
  const newBox = correct ? Math.min(currentBox + 1, MAX_BOX) : 1
  const dueAt = new Date(Date.now() + BOX_INTERVAL_DAYS[newBox] * 24 * 60 * 60 * 1000)
  const now = new Date()

  await prisma.farsiLetterProgress.upsert({
    where: { userId_letterChar_position: { userId, letterChar, position } },
    create: { userId, letterChar, position, box: newBox, dueAt, lastReviewedAt: now },
    update: { box: newBox, dueAt, lastReviewedAt: now },
  })

  return { box: newBox, dueAt }
}

// ── Streak ─────────────────────────────────────────────

export interface StreakDTO {
  currentStreak: number
  longestStreak: number
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// Ein "Lerntag" ist jeder Kalendertag (UTC), an dem irgendeine Karte
// bewertet wurde — Vokabeln, Schrift oder Buchstaben zählen alle gleich.
export async function getStudyStreak(userId: string): Promise<StreakDTO> {
  const [progressRows, letterRows] = await Promise.all([
    prisma.farsiProgress.findMany({
      where: { userId, lastReviewedAt: { not: null } },
      select: { lastReviewedAt: true },
    }),
    prisma.farsiLetterProgress.findMany({
      where: { userId, lastReviewedAt: { not: null } },
      select: { lastReviewedAt: true },
    }),
  ])

  const days = new Set<string>()
  for (const row of [...progressRows, ...letterRows]) {
    if (row.lastReviewedAt) days.add(toDateKey(row.lastReviewedAt))
  }

  if (days.size === 0) return { currentStreak: 0, longestStreak: 0 }

  const sortedDays = [...days].sort()
  const dayTimestamps = sortedDays.map((d) => new Date(d + 'T00:00:00.000Z').getTime())
  const oneDayMs = 24 * 60 * 60 * 1000

  let longestStreak = 1
  let run = 1
  for (let i = 1; i < dayTimestamps.length; i++) {
    if (dayTimestamps[i] - dayTimestamps[i - 1] === oneDayMs) {
      run += 1
    } else {
      run = 1
    }
    longestStreak = Math.max(longestStreak, run)
  }

  const todayKey = toDateKey(new Date())
  const yesterdayKey = toDateKey(new Date(Date.now() - oneDayMs))
  const mostRecentKey = sortedDays[sortedDays.length - 1]

  // Streak ist "abgelaufen", wenn weder heute noch gestern geübt wurde.
  let currentStreak = 0
  if (mostRecentKey === todayKey || mostRecentKey === yesterdayKey) {
    currentStreak = 1
    for (let i = dayTimestamps.length - 1; i > 0; i--) {
      if (dayTimestamps[i] - dayTimestamps[i - 1] === oneDayMs) {
        currentStreak += 1
      } else {
        break
      }
    }
  }

  return { currentStreak, longestStreak }
}
