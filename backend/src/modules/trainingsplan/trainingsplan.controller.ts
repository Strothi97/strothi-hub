import { Request, Response } from 'express'
import * as trainingsplanService from './trainingsplan.service'
import { AppError } from '../../utils/appError'

// focusAreas sind Schlüssel aus den Trainingsbereichen des Nutzers — geprüft
// gegen dessen aktuelle Liste (gleiche Haltung wie assertValidChoice in
// kochbuch.controller.ts).
async function assertValidFocusAreas(userId: string, focusAreas: unknown): Promise<void> {
  if (!Array.isArray(focusAreas) || focusAreas.length === 0) {
    throw new AppError('Bitte mindestens einen Trainingsfokus wählen.', 400)
  }
  const allowed = await trainingsplanService.getFocusAreaKeys(userId)
  const invalid = focusAreas.some((f) => typeof f !== 'string' || !allowed.includes(f))
  if (invalid) {
    throw new AppError('Mindestens ein Trainingsfokus existiert nicht mehr.', 400)
  }
}

function assertValidUnit(unit: unknown): void {
  if (typeof unit !== 'string' || !(trainingsplanService.EXERCISE_UNITS as string[]).includes(unit)) {
    throw new AppError(`Einheit muss eine von ${trainingsplanService.EXERCISE_UNITS.join(', ')} sein.`, 400)
  }
}

// secondaryUnit ist optional (null = keine Zweiteinheit), aber wenn gesetzt,
// muss sie gültig, von der Haupteinheit verschieden und keine
// "Körpergewicht"-Einheit sein (als Zweiteinheit sinnfrei).
function assertValidSecondaryUnit(secondaryUnit: unknown, unit: unknown): void {
  if (secondaryUnit === null || secondaryUnit === undefined) return
  assertValidUnit(secondaryUnit)
  if (secondaryUnit === unit) {
    throw new AppError('Die zweite Einheit darf nicht identisch mit der Haupteinheit sein.', 400)
  }
  if (secondaryUnit === 'BODYWEIGHT') {
    throw new AppError('"Körpergewicht" kann nicht als zweite Einheit gewählt werden.', 400)
  }
}

function assertValidPerformedAt(performedAt: unknown): Date {
  const date = new Date(performedAt as string)
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Ungültiges Datum/Uhrzeit.', 400)
  }
  return date
}

export const listExercises = async (req: Request, res: Response) => {
  const { search, focusAreas, includeArchived } = req.query as {
    search?: string
    focusAreas?: string | string[]
    includeArchived?: string
  }
  const focusAreaList = focusAreas
    ? ((Array.isArray(focusAreas) ? focusAreas : [focusAreas]) as string[])
    : undefined
  const exercises = await trainingsplanService.listExercises(req.user!.id, {
    search,
    focusAreas: focusAreaList,
    includeArchived: includeArchived === 'true',
  })
  return res.json({ exercises })
}

export const getExercise = async (req: Request, res: Response) => {
  const exercise = await trainingsplanService.getExercise(req.user!.id, req.params.id)
  if (!exercise) return res.status(404).json({ message: 'Übung nicht gefunden' })
  return res.json({ exercise })
}

export const createExercise = async (req: Request, res: Response) => {
  await assertValidFocusAreas(req.user!.id, req.body?.focusAreas)
  assertValidUnit(req.body?.unit)
  assertValidSecondaryUnit(req.body?.secondaryUnit, req.body?.unit)
  const exercise = await trainingsplanService.createExercise(req.user!.id, req.body)
  return res.status(201).json({ exercise })
}

export const updateExercise = async (req: Request, res: Response) => {
  if (req.body?.focusAreas !== undefined) await assertValidFocusAreas(req.user!.id, req.body.focusAreas)
  if (req.body?.unit !== undefined) assertValidUnit(req.body.unit)
  if (req.body?.secondaryUnit !== undefined) assertValidSecondaryUnit(req.body.secondaryUnit, req.body?.unit)
  const exercise = await trainingsplanService.updateExercise(req.user!.id, req.params.id, req.body)
  if (!exercise) return res.status(404).json({ message: 'Übung nicht gefunden' })
  return res.json({ exercise })
}

export const deleteExercise = async (req: Request, res: Response) => {
  const deleted = await trainingsplanService.deleteExercise(req.user!.id, req.params.id)
  if (!deleted) return res.status(404).json({ message: 'Übung nicht gefunden' })
  return res.status(204).send()
}

export const getExerciseHistory = async (req: Request, res: Response) => {
  const history = await trainingsplanService.getExerciseHistory(req.user!.id, req.params.id)
  return res.json({ history })
}

export const uploadExercisePhoto = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'Keine Datei hochgeladen' })
  const exercise = await trainingsplanService.saveExercisePhoto(req.user!.id, req.params.id, req.file.buffer)
  if (!exercise) return res.status(404).json({ message: 'Übung nicht gefunden' })
  return res.json({ exercise })
}

export const uploadExerciseSectionPhoto = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'Keine Datei hochgeladen' })
  const sectionIndex = Number(req.params.index)
  if (!Number.isInteger(sectionIndex)) return res.status(400).json({ message: 'Ungültiger Abschnitt-Index' })
  const exercise = await trainingsplanService.saveExerciseSectionPhoto(
    req.user!.id,
    req.params.id,
    sectionIndex,
    req.file.buffer,
  )
  if (!exercise) return res.status(404).json({ message: 'Übung oder Abschnitt nicht gefunden' })
  return res.json({ exercise })
}

export const listSessions = async (req: Request, res: Response) => {
  const sessions = await trainingsplanService.listSessions(req.user!.id)
  return res.json({ sessions })
}

export const getSession = async (req: Request, res: Response) => {
  const session = await trainingsplanService.getSession(req.user!.id, req.params.id)
  if (!session) return res.status(404).json({ message: 'Einheit nicht gefunden' })
  return res.json({ session })
}

export const createSession = async (req: Request, res: Response) => {
  const performedAt = assertValidPerformedAt(req.body?.performedAt)
  const session = await trainingsplanService.createSession(req.user!.id, { performedAt, note: req.body?.note })
  return res.status(201).json({ session })
}

export const updateSession = async (req: Request, res: Response) => {
  const input: { performedAt?: Date; note?: string | null } = {}
  if (req.body?.performedAt !== undefined) input.performedAt = assertValidPerformedAt(req.body.performedAt)
  if (req.body?.note !== undefined) input.note = req.body.note
  const session = await trainingsplanService.updateSession(req.user!.id, req.params.id, input)
  if (!session) return res.status(404).json({ message: 'Einheit nicht gefunden' })
  return res.json({ session })
}

export const deleteSession = async (req: Request, res: Response) => {
  const deleted = await trainingsplanService.deleteSession(req.user!.id, req.params.id)
  if (!deleted) return res.status(404).json({ message: 'Einheit nicht gefunden' })
  return res.status(204).send()
}

export const addSessionExercise = async (req: Request, res: Response) => {
  const { exerciseId, sets } = req.body as {
    exerciseId?: string
    sets?: { value: number | null; reps: number | null }[]
  }
  if (!exerciseId) throw new AppError('Bitte eine Übung wählen.', 400)
  const session = await trainingsplanService.addSessionExercise(req.user!.id, req.params.id, {
    exerciseId,
    sets: sets ?? [],
  })
  if (!session) return res.status(404).json({ message: 'Einheit nicht gefunden' })
  return res.status(201).json({ session })
}

export const updateSessionExerciseSets = async (req: Request, res: Response) => {
  const { sets } = req.body as { sets?: { value: number | null; reps: number | null }[] }
  const session = await trainingsplanService.replaceSessionExerciseSets(
    req.user!.id,
    req.params.id,
    req.params.sessionExerciseId,
    sets ?? [],
  )
  if (!session) return res.status(404).json({ message: 'Übung in dieser Einheit nicht gefunden' })
  return res.json({ session })
}

export const removeSessionExercise = async (req: Request, res: Response) => {
  const session = await trainingsplanService.removeSessionExercise(
    req.user!.id,
    req.params.id,
    req.params.sessionExerciseId,
  )
  if (!session) return res.status(404).json({ message: 'Übung in dieser Einheit nicht gefunden' })
  return res.json({ session })
}

function assertValidFocusAreaName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name) throw new AppError('Bitte einen Namen für den Bereich angeben.', 400)
  if (name.length > 40) throw new AppError('Der Name ist zu lang.', 400)
  return name
}

function assertValidFocusAreaIcon(value: unknown): string {
  const icon = typeof value === 'string' ? value.trim() : ''
  if (!icon) throw new AppError('Bitte ein Icon angeben.', 400)
  if (icon.length > 8) throw new AppError('Das Icon ist zu lang.', 400)
  return icon
}

export const listFocusAreas = async (req: Request, res: Response) => {
  const focusAreas = await trainingsplanService.listFocusAreas(req.user!.id)
  return res.json({ focusAreas })
}

export const createFocusArea = async (req: Request, res: Response) => {
  const focusArea = await trainingsplanService.createFocusArea(req.user!.id, {
    name: assertValidFocusAreaName(req.body?.name),
    icon: assertValidFocusAreaIcon(req.body?.icon),
  })
  return res.status(201).json({ focusArea })
}

export const updateFocusArea = async (req: Request, res: Response) => {
  const input: { name?: string; icon?: string } = {}
  if (req.body?.name !== undefined) input.name = assertValidFocusAreaName(req.body.name)
  if (req.body?.icon !== undefined) input.icon = assertValidFocusAreaIcon(req.body.icon)
  const focusArea = await trainingsplanService.updateFocusArea(req.user!.id, req.params.id, input)
  if (!focusArea) return res.status(404).json({ message: 'Bereich nicht gefunden' })
  return res.json({ focusArea })
}

export const deleteFocusArea = async (req: Request, res: Response) => {
  const deleted = await trainingsplanService.deleteFocusArea(req.user!.id, req.params.id)
  if (!deleted) return res.status(404).json({ message: 'Bereich nicht gefunden' })
  return res.status(204).send()
}
