import { FarsiWordType } from '@prisma/client'
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

function toDTO(row: RawEntry): FarsiEntryDTO {
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
  const rows = await prisma.farsiEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  let entries = rows.map(toDTO)

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
