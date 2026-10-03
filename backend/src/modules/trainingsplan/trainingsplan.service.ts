import fs from 'fs/promises'
import { randomBytes } from 'crypto'
import path from 'path'
import sharp from 'sharp'
import { ExerciseUnit } from '@prisma/client'
import { prisma } from '../../db'
import { AppError } from '../../utils/appError'

// Trainingsplan ist bewusst NICHT geteilt wie das Kochbuch, sondern privat
// pro Nutzer (wie Farsi/Erinnerungen/Homeoffice) — jede Funktion hier filtert
// nach userId.

// ── Trainingsbereiche (pro Nutzer) ───────────────────────

// Startwerte für jeden Nutzer. Die Schlüssel sind die bisherigen festen Werte,
// damit bestehende Übungen ohne Datenänderung gültig bleiben.
export const DEFAULT_FOCUS_AREAS = [
  { key: 'brust', name: 'Brust', icon: '💪' },
  { key: 'ruecken', name: 'Rücken', icon: '🔙' },
  { key: 'beine', name: 'Beine', icon: '🦵' },
  { key: 'schultern', name: 'Schultern', icon: '🏋️' },
  { key: 'bizeps', name: 'Bizeps', icon: '💪' },
  { key: 'trizeps', name: 'Trizeps', icon: '💪' },
  { key: 'bauch', name: 'Bauch', icon: '🔥' },
  { key: 'ganzkoerper', name: 'Ganzkörper', icon: '🤸' },
  { key: 'cardio', name: 'Cardio', icon: '🏃' },
] as const

// Nur bei leerer Liste anlegen — sonst würden gelöschte Standardbereiche
// bei jedem Aufruf wieder auftauchen.
async function ensureDefaultFocusAreas(userId: string): Promise<void> {
  const count = await prisma.focusArea.count({ where: { userId } })
  if (count > 0) return
  await prisma.focusArea.createMany({
    data: DEFAULT_FOCUS_AREAS.map((area, index) => ({
      userId,
      key: area.key,
      name: area.name,
      icon: area.icon,
      sortOrder: index,
    })),
  })
}

export const EXERCISE_UNITS: ExerciseUnit[] = ['KG', 'G', 'S', 'MIN', 'H', 'KM', 'M', 'BODYWEIGHT']

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : []
}

// ── Info-Sections ("So geht's"-Anleitung) ────────────────
// Flach wie RecipeStep bei Kochbuch, nie unabhängig von der Übung abgefragt.
// Rendert im Frontend als aufwendig gestaltetes Popup (UebungInfoModal).

export interface ExerciseInfoSection {
  title: string
  text: string
  imageUrl: string | null
}

function toInfoSections(value: unknown): ExerciseInfoSection[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const raw = item as Record<string, unknown>
    return {
      title: typeof raw.title === 'string' ? raw.title : '',
      text: typeof raw.text === 'string' ? raw.text : '',
      imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : null,
    }
  })
}

export interface FocusAreaDTO {
  id: string
  key: string
  name: string
  icon: string
  sortOrder: number
  usageCount: number
}

function toFocusAreaDTO(
  row: { id: string; key: string; name: string; icon: string; sortOrder: number },
  usageCount: number,
): FocusAreaDTO {
  return { id: row.id, key: row.key, name: row.name, icon: row.icon, sortOrder: row.sortOrder, usageCount }
}

// Zählt, wie viele Übungen je Bereichsschlüssel verwendet werden. focusAreas
// ist ein Json-Array, daher wird in JS gezählt (kleine persönliche Datenmenge).
async function countFocusAreaUsage(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.exercise.findMany({ where: { userId }, select: { focusAreas: true } })
  const counts = new Map<string, number>()
  for (const row of rows) {
    for (const key of toStringArray(row.focusAreas)) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return counts
}

export async function listFocusAreas(userId: string): Promise<FocusAreaDTO[]> {
  await ensureDefaultFocusAreas(userId)
  const [areas, usage] = await Promise.all([
    prisma.focusArea.findMany({ where: { userId }, orderBy: { sortOrder: 'asc' } }),
    countFocusAreaUsage(userId),
  ])
  return areas.map((area) => toFocusAreaDTO(area, usage.get(area.key) ?? 0))
}

// Gültige Schlüssel des Nutzers — dagegen werden focusAreas bei Übungen geprüft.
export async function getFocusAreaKeys(userId: string): Promise<string[]> {
  await ensureDefaultFocusAreas(userId)
  const areas = await prisma.focusArea.findMany({ where: { userId }, select: { key: true } })
  return areas.map((area) => area.key)
}

// Schlüssel bleibt nach dem Anlegen stabil, auch wenn der Name später geändert wird.
function createKeyFromName(name: string): string {
  const slug =
    name
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'bereich'
  return `${slug}-${randomBytes(3).toString('hex')}`
}

export async function createFocusArea(userId: string, input: { name: string; icon: string }): Promise<FocusAreaDTO> {
  await ensureDefaultFocusAreas(userId)
  const last = await prisma.focusArea.findFirst({
    where: { userId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })
  const row = await prisma.focusArea.create({
    data: {
      userId,
      key: createKeyFromName(input.name),
      name: input.name,
      icon: input.icon,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  })
  return toFocusAreaDTO(row, 0)
}

export async function updateFocusArea(
  userId: string,
  id: string,
  input: { name?: string; icon?: string },
): Promise<FocusAreaDTO | null> {
  const existing = await prisma.focusArea.findFirst({ where: { id, userId } })
  if (!existing) return null
  const row = await prisma.focusArea.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.icon !== undefined && { icon: input.icon }),
    },
  })
  const usage = await countFocusAreaUsage(userId)
  return toFocusAreaDTO(row, usage.get(row.key) ?? 0)
}

// Ein noch verwendeter Bereich lässt sich nicht löschen — sonst bliebe bei
// Übungen ein Schlüssel ohne Anzeigenamen zurück.
export async function deleteFocusArea(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.focusArea.findFirst({ where: { id, userId } })
  if (!existing) return false
  const usage = (await countFocusAreaUsage(userId)).get(existing.key) ?? 0
  if (usage > 0) {
    throw new AppError(
      `Dieser Bereich wird noch von ${usage} Übung${usage === 1 ? '' : 'en'} verwendet — bitte dort zuerst entfernen.`,
      409,
    )
  }
  await prisma.focusArea.delete({ where: { id } })
  return true
}

// ── Trainingsgeräte (pro Nutzer) ─────────────────────────

export interface EquipmentDTO {
  id: string
  key: string
  name: string
  sortOrder: number
  usageCount: number
}

function toEquipmentDTO(
  row: { id: string; key: string; name: string; sortOrder: number },
  usageCount: number,
): EquipmentDTO {
  return { id: row.id, key: row.key, name: row.name, sortOrder: row.sortOrder, usageCount }
}

async function countEquipmentUsage(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.exercise.findMany({
    where: { userId, equipmentKey: { not: null } },
    select: { equipmentKey: true },
  })
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (row.equipmentKey) counts.set(row.equipmentKey, (counts.get(row.equipmentKey) ?? 0) + 1)
  }
  return counts
}

export async function listEquipment(userId: string): Promise<EquipmentDTO[]> {
  const [items, usage] = await Promise.all([
    prisma.equipment.findMany({ where: { userId }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    countEquipmentUsage(userId),
  ])
  return items.map((item) => toEquipmentDTO(item, usage.get(item.key) ?? 0))
}

// Gültige Gerätschlüssel des Nutzers — dagegen wird equipmentKey bei Übungen geprüft.
export async function getEquipmentKeys(userId: string): Promise<string[]> {
  const items = await prisma.equipment.findMany({ where: { userId }, select: { key: true } })
  return items.map((item) => item.key)
}

export async function createEquipment(userId: string, input: { name: string }): Promise<EquipmentDTO> {
  const last = await prisma.equipment.findFirst({
    where: { userId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })
  const row = await prisma.equipment.create({
    data: {
      userId,
      key: createKeyFromName(input.name),
      name: input.name,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  })
  return toEquipmentDTO(row, 0)
}

export async function updateEquipment(
  userId: string,
  id: string,
  input: { name?: string },
): Promise<EquipmentDTO | null> {
  const existing = await prisma.equipment.findFirst({ where: { id, userId } })
  if (!existing) return null
  const row = await prisma.equipment.update({
    where: { id },
    data: { ...(input.name !== undefined && { name: input.name }) },
  })
  const usage = await countEquipmentUsage(userId)
  return toEquipmentDTO(row, usage.get(row.key) ?? 0)
}

// Ein noch zugewiesenes Gerät lässt sich nicht löschen — sonst hätte eine Übung
// einen Schlüssel ohne Anzeigenamen.
export async function deleteEquipment(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.equipment.findFirst({ where: { id, userId } })
  if (!existing) return false
  const usage = (await countEquipmentUsage(userId)).get(existing.key) ?? 0
  if (usage > 0) {
    throw new AppError(
      `Dieses Gerät wird noch von ${usage} Übung${usage === 1 ? '' : 'en'} verwendet — bitte dort zuerst entfernen.`,
      409,
    )
  }
  await prisma.equipment.delete({ where: { id } })
  return true
}

// ── DTO: Exercise ─────────────────────────────────────────

export interface ExerciseDTO {
  id: string
  name: string
  focusAreas: string[]
  unit: ExerciseUnit
  secondaryUnit: ExerciseUnit | null
  equipmentKey: string | null
  imageUrl: string | null
  infoSections: ExerciseInfoSection[]
  isArchived: boolean
  usageCount: number
  createdAt: Date
  updatedAt: Date
}

const EXERCISE_INCLUDE = { _count: { select: { sessionExercises: true } } } as const

function toExerciseDTO(row: {
  id: string
  name: string
  focusAreas: unknown
  unit: ExerciseUnit
  secondaryUnit: ExerciseUnit | null
  equipmentKey: string | null
  imageUrl: string | null
  infoSections: unknown
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
  _count?: { sessionExercises: number }
}): ExerciseDTO {
  return {
    id: row.id,
    name: row.name,
    focusAreas: toStringArray(row.focusAreas),
    unit: row.unit,
    secondaryUnit: row.secondaryUnit,
    equipmentKey: row.equipmentKey,
    imageUrl: row.imageUrl,
    infoSections: toInfoSections(row.infoSections),
    isArchived: row.archivedAt !== null,
    usageCount: row._count?.sessionExercises ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// ── Übungen (Katalog) ─────────────────────────────────────

interface ListExercisesFilters {
  search?: string
  focusAreas?: string[]
  includeArchived?: boolean
}

// Kleine, persönliche Datenmenge — Bulk-Laden + Suche/Filter in JS (gleiches
// Muster wie farsi.service.ts/kochbuch.service.ts).
export async function listExercises(userId: string, filters: ListExercisesFilters): Promise<ExerciseDTO[]> {
  const rows = await prisma.exercise.findMany({
    where: { userId },
    include: EXERCISE_INCLUDE,
    orderBy: { name: 'asc' },
  })
  let exercises = rows.map(toExerciseDTO)

  if (!filters.includeArchived) {
    exercises = exercises.filter((e) => !e.isArchived)
  }
  if (filters.focusAreas && filters.focusAreas.length > 0) {
    exercises = exercises.filter((e) => e.focusAreas.some((f) => filters.focusAreas!.includes(f)))
  }
  const needle = filters.search?.trim().toLowerCase()
  if (needle) {
    exercises = exercises.filter((e) => e.name.toLowerCase().includes(needle))
  }
  return exercises
}

export async function getExercise(userId: string, id: string): Promise<ExerciseDTO | null> {
  const row = await prisma.exercise.findFirst({ where: { id, userId }, include: EXERCISE_INCLUDE })
  return row ? toExerciseDTO(row) : null
}

export interface ExerciseInput {
  name: string
  focusAreas: string[]
  unit: ExerciseUnit
  secondaryUnit?: ExerciseUnit | null
  equipmentKey?: string | null
  infoSections?: ExerciseInfoSection[]
}

export async function createExercise(userId: string, input: ExerciseInput): Promise<ExerciseDTO> {
  const row = await prisma.exercise.create({
    data: {
      userId,
      name: input.name,
      focusAreas: input.focusAreas,
      unit: input.unit,
      secondaryUnit: input.secondaryUnit ?? null,
      equipmentKey: input.equipmentKey ?? null,
      infoSections: (input.infoSections ?? []) as unknown as object,
    },
    include: EXERCISE_INCLUDE,
  })
  return toExerciseDTO(row)
}

// archived: true/false setzt bzw. löscht archivedAt — Archivieren statt
// Löschen für bereits genutzte Übungen (siehe deleteExercise).
export async function updateExercise(
  userId: string,
  id: string,
  input: Partial<ExerciseInput> & { archived?: boolean },
): Promise<ExerciseDTO | null> {
  const existing = await prisma.exercise.findFirst({ where: { id, userId } })
  if (!existing) return null

  const row = await prisma.exercise.update({
    where: { id },
    include: EXERCISE_INCLUDE,
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.focusAreas !== undefined && { focusAreas: input.focusAreas }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.secondaryUnit !== undefined && { secondaryUnit: input.secondaryUnit }),
      ...(input.equipmentKey !== undefined && { equipmentKey: input.equipmentKey }),
      ...(input.infoSections !== undefined && { infoSections: input.infoSections as unknown as object }),
      ...(input.archived !== undefined && { archivedAt: input.archived ? new Date() : null }),
    },
  })
  return toExerciseDTO(row)
}

// Nur erreichbar für nie genutzte Übungen — sonst AppError, die aufrufende
// Seite bietet dann "Archivieren" an (siehe updateExercise/archived).
export async function deleteExercise(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.exercise.findFirst({ where: { id, userId } })
  if (!existing) return false

  const usageCount = await prisma.sessionExercise.count({ where: { exerciseId: id } })
  if (usageCount > 0) {
    throw new AppError('Diese Übung wurde bereits verwendet — bitte stattdessen archivieren statt löschen.', 409)
  }

  if (existing.imageUrl) await deletePhotoFile(existing.imageUrl)
  for (const section of toInfoSections(existing.infoSections)) {
    if (section.imageUrl) await deletePhotoFile(section.imageUrl)
  }

  await prisma.exercise.delete({ where: { id } })
  return true
}

// ── Foto-Upload ───────────────────────────────────────────
// Gleiches Muster wie kochbuch.service.ts (saveRecipePhoto/saveStepPhoto):
// pro Tool und Nutzer getrennter Upload-Ordner, komprimiertes WebP,
// unbeschnitten (fit: 'inside', kein quadratischer Zuschnitt).

export const UPLOADS_BASE = path.join(__dirname, '..', '..', '..', process.env.UPLOAD_DIR || 'uploads')
const PHOTO_UPLOAD_ROOT = path.join(UPLOADS_BASE, 'trainingsplan')

async function deletePhotoFile(photoUrl: string) {
  const oldPath = path.join(UPLOADS_BASE, photoUrl.replace(/^\/uploads\//, ''))
  await fs.unlink(oldPath).catch(() => {})
}

export async function saveExercisePhoto(userId: string, id: string, buffer: Buffer): Promise<ExerciseDTO | null> {
  const existing = await prisma.exercise.findFirst({ where: { id, userId } })
  if (!existing) return null

  const userDir = path.join(PHOTO_UPLOAD_ROOT, userId)
  await fs.mkdir(userDir, { recursive: true })

  const filename = `${id}-${Date.now()}.webp`
  await sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(userDir, filename))

  if (existing.imageUrl) await deletePhotoFile(existing.imageUrl)

  const imageUrl = `/uploads/trainingsplan/${userId}/${filename}`
  const row = await prisma.exercise.update({
    where: { id },
    data: { imageUrl },
    include: EXERCISE_INCLUDE,
  })
  return toExerciseDTO(row)
}

// sectionIndex ist die Position im infoSections-Array (0-basiert), analog zu
// saveStepPhoto bei Kochbuch.
export async function saveExerciseSectionPhoto(
  userId: string,
  id: string,
  sectionIndex: number,
  buffer: Buffer,
): Promise<ExerciseDTO | null> {
  const existing = await prisma.exercise.findFirst({ where: { id, userId } })
  if (!existing) return null

  const sections = toInfoSections(existing.infoSections)
  if (sectionIndex < 0 || sectionIndex >= sections.length) return null

  const userDir = path.join(PHOTO_UPLOAD_ROOT, userId)
  await fs.mkdir(userDir, { recursive: true })

  const filename = `${id}-section${sectionIndex}-${Date.now()}.webp`
  await sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(userDir, filename))

  const oldSectionPhoto = sections[sectionIndex].imageUrl
  if (oldSectionPhoto) await deletePhotoFile(oldSectionPhoto)

  sections[sectionIndex] = { ...sections[sectionIndex], imageUrl: `/uploads/trainingsplan/${userId}/${filename}` }

  const row = await prisma.exercise.update({
    where: { id },
    data: { infoSections: sections as unknown as object },
    include: EXERCISE_INCLUDE,
  })
  return toExerciseDTO(row)
}

// ── Verlauf einer Übung (für Uebungen-Detail: "letzte Trainingseinheiten" +
//    Statistiken, die im Frontend aus diesen Rohdaten berechnet werden) ────

export interface ExerciseHistorySetDTO {
  order: number
  value: number | null
  reps: number | null
  secondaryValue: number | null
}

export interface ExerciseHistoryEntryDTO {
  sessionId: string
  performedAt: Date
  sessionExerciseId: string
  sets: ExerciseHistorySetDTO[]
}

export async function getExerciseHistory(userId: string, exerciseId: string): Promise<ExerciseHistoryEntryDTO[]> {
  const rows = await prisma.sessionExercise.findMany({
    where: { exerciseId, exercise: { userId }, session: { userId } },
    include: {
      session: { select: { id: true, performedAt: true } },
      sets: { orderBy: { order: 'asc' } },
    },
    orderBy: { session: { performedAt: 'desc' } },
  })
  return rows.map((row) => ({
    sessionId: row.session.id,
    performedAt: row.session.performedAt,
    sessionExerciseId: row.id,
    sets: row.sets.map((s) => ({ order: s.order, value: s.value, reps: s.reps, secondaryValue: s.secondaryValue })),
  }))
}

// ── Trainingseinheiten ────────────────────────────────────

export interface SessionListItemDTO {
  id: string
  performedAt: Date
  note: string | null
  exerciseCount: number
  createdAt: Date
}

export async function listSessions(userId: string): Promise<SessionListItemDTO[]> {
  const rows = await prisma.trainingSession.findMany({
    where: { userId },
    include: { _count: { select: { exercises: true } } },
    orderBy: { performedAt: 'desc' },
  })
  return rows.map((row) => ({
    id: row.id,
    performedAt: row.performedAt,
    note: row.note,
    exerciseCount: row._count.exercises,
    createdAt: row.createdAt,
  }))
}

export interface SessionExerciseSetDTO {
  id: string
  order: number
  value: number | null
  reps: number | null
  secondaryValue: number | null
}

export interface SessionExerciseDTO {
  id: string
  order: number
  exercise: {
    id: string
    name: string
    unit: ExerciseUnit
    secondaryUnit: ExerciseUnit | null
    equipmentKey: string | null
    imageUrl: string | null
    focusAreas: string[]
    isArchived: boolean
  }
  sets: SessionExerciseSetDTO[]
}

export interface SessionDetailDTO {
  id: string
  performedAt: Date
  note: string | null
  exercises: SessionExerciseDTO[]
  createdAt: Date
  updatedAt: Date
}

const SESSION_DETAIL_INCLUDE = {
  exercises: {
    orderBy: { order: 'asc' as const },
    include: {
      exercise: true,
      sets: { orderBy: { order: 'asc' as const } },
    },
  },
}

function toSessionDetailDTO(row: {
  id: string
  performedAt: Date
  note: string | null
  createdAt: Date
  updatedAt: Date
  exercises: {
    id: string
    order: number
    exercise: {
      id: string
      name: string
      unit: ExerciseUnit
      secondaryUnit: ExerciseUnit | null
      equipmentKey: string | null
      imageUrl: string | null
      focusAreas: unknown
      archivedAt: Date | null
    }
    sets: { id: string; order: number; value: number | null; reps: number | null; secondaryValue: number | null }[]
  }[]
}): SessionDetailDTO {
  return {
    id: row.id,
    performedAt: row.performedAt,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    exercises: row.exercises.map((se) => ({
      id: se.id,
      order: se.order,
      exercise: {
        id: se.exercise.id,
        name: se.exercise.name,
        unit: se.exercise.unit,
        secondaryUnit: se.exercise.secondaryUnit,
        equipmentKey: se.exercise.equipmentKey,
        imageUrl: se.exercise.imageUrl,
        focusAreas: toStringArray(se.exercise.focusAreas),
        isArchived: se.exercise.archivedAt !== null,
      },
      sets: se.sets.map((s) => ({ id: s.id, order: s.order, value: s.value, reps: s.reps, secondaryValue: s.secondaryValue })),
    })),
  }
}

export async function getSession(userId: string, id: string): Promise<SessionDetailDTO | null> {
  const row = await prisma.trainingSession.findFirst({
    where: { id, userId },
    include: SESSION_DETAIL_INCLUDE,
  })
  return row ? toSessionDetailDTO(row) : null
}

export interface SessionInput {
  performedAt: Date
  note?: string | null
}

export async function createSession(userId: string, input: SessionInput): Promise<SessionDetailDTO> {
  const row = await prisma.trainingSession.create({
    data: { userId, performedAt: input.performedAt, note: input.note || null },
    include: SESSION_DETAIL_INCLUDE,
  })
  return toSessionDetailDTO(row)
}

export async function updateSession(
  userId: string,
  id: string,
  input: Partial<SessionInput>,
): Promise<SessionDetailDTO | null> {
  const existing = await prisma.trainingSession.findFirst({ where: { id, userId } })
  if (!existing) return null

  const row = await prisma.trainingSession.update({
    where: { id },
    include: SESSION_DETAIL_INCLUDE,
    data: {
      ...(input.performedAt !== undefined && { performedAt: input.performedAt }),
      ...(input.note !== undefined && { note: input.note || null }),
    },
  })
  return toSessionDetailDTO(row)
}

export async function deleteSession(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.trainingSession.findFirst({ where: { id, userId } })
  if (!existing) return false
  await prisma.trainingSession.delete({ where: { id } })
  return true
}

// ── Übung in einer Einheit loggen ────────────────────────

export interface SetInput {
  value: number | null
  reps: number | null
  secondaryValue?: number | null
}

// order wird serverseitig vergeben: für SessionExercise als aktuelle Anzahl
// der Übungen in der Einheit (Anhänge-Reihenfolge), für die Sets als
// Array-Position — kein Drag-Reorder im MVP (siehe Plan).
export async function addSessionExercise(
  userId: string,
  sessionId: string,
  input: { exerciseId: string; sets: SetInput[] },
): Promise<SessionDetailDTO | null> {
  const session = await prisma.trainingSession.findFirst({ where: { id: sessionId, userId } })
  if (!session) return null

  const exercise = await prisma.exercise.findFirst({ where: { id: input.exerciseId, userId } })
  if (!exercise) throw new AppError('Übung nicht gefunden.', 404)

  const currentCount = await prisma.sessionExercise.count({ where: { sessionId } })

  await prisma.sessionExercise.create({
    data: {
      sessionId,
      exerciseId: input.exerciseId,
      order: currentCount,
      sets: {
        create: input.sets.map((s, index) => ({
          order: index,
          value: s.value,
          reps: s.reps,
          secondaryValue: s.secondaryValue ?? null,
        })),
      },
    },
  })

  return getSession(userId, sessionId)
}

// Einfachste robuste Variante: alle Sets der Übung löschen und neu anlegen,
// statt einzeln zu diffen (gleicher Geist wie das Json-Replace-Muster bei
// Kochbuch, hier nur auf relationale Zeilen angewandt).
export async function replaceSessionExerciseSets(
  userId: string,
  sessionId: string,
  sessionExerciseId: string,
  sets: SetInput[],
): Promise<SessionDetailDTO | null> {
  const sessionExercise = await prisma.sessionExercise.findFirst({
    where: { id: sessionExerciseId, sessionId, session: { userId } },
  })
  if (!sessionExercise) return null

  await prisma.setEntry.deleteMany({ where: { sessionExerciseId } })
  await prisma.setEntry.createMany({
    data: sets.map((s, index) => ({
      sessionExerciseId,
      order: index,
      value: s.value,
      reps: s.reps,
      secondaryValue: s.secondaryValue ?? null,
    })),
  })

  return getSession(userId, sessionId)
}

export async function removeSessionExercise(
  userId: string,
  sessionId: string,
  sessionExerciseId: string,
): Promise<SessionDetailDTO | null> {
  const sessionExercise = await prisma.sessionExercise.findFirst({
    where: { id: sessionExerciseId, sessionId, session: { userId } },
  })
  if (!sessionExercise) return null

  await prisma.sessionExercise.delete({ where: { id: sessionExerciseId } })
  return getSession(userId, sessionId)
}
