import { Request, Response } from 'express'
import { FarsiWordType, FarsiStudyMode } from '@prisma/client'
import * as farsiService from './farsi.service'

const STUDY_MODES: FarsiStudyMode[] = ['VOCAB', 'SCRIPT']

export const listEntries = async (req: Request, res: Response) => {
  const { search, type, onlyIncomplete } = req.query as {
    search?: string
    type?: FarsiWordType
    onlyIncomplete?: string
  }
  const entries = await farsiService.listEntries(req.user!.id, {
    search,
    type,
    onlyIncomplete: onlyIncomplete === 'true',
  })
  return res.json({ entries })
}

export const createEntry = async (req: Request, res: Response) => {
  const entry = await farsiService.createEntry(req.user!.id, req.body)
  return res.status(201).json({ entry })
}

export const updateEntry = async (req: Request, res: Response) => {
  const entry = await farsiService.updateEntry(req.user!.id, req.params.id, req.body)
  if (!entry) {
    return res.status(404).json({ message: 'Eintrag nicht gefunden' })
  }
  return res.json({ entry })
}

export const deleteEntry = async (req: Request, res: Response) => {
  const deleted = await farsiService.deleteEntry(req.user!.id, req.params.id)
  if (!deleted) {
    return res.status(404).json({ message: 'Eintrag nicht gefunden' })
  }
  return res.status(204).send()
}

export const importEntries = async (req: Request, res: Response) => {
  const result = await farsiService.importEntries(req.user!.id, req.body)
  return res.status(201).json(result)
}

// ── Study / Leitner-Box ────────────────────────────────

export const getStudySession = async (req: Request, res: Response) => {
  const { mode, limit } = req.query as { mode?: string; limit?: string }
  if (!mode || !STUDY_MODES.includes(mode as FarsiStudyMode)) {
    return res.status(400).json({ message: 'Ungültiger oder fehlender "mode"-Parameter.' })
  }
  const session = await farsiService.getStudySession(
    req.user!.id,
    mode as FarsiStudyMode,
    limit ? Number(limit) : undefined,
  )
  return res.json(session)
}

export const reviewCard = async (req: Request, res: Response) => {
  const { mode, correct } = req.body as { mode?: string; correct?: boolean }
  if (!mode || !STUDY_MODES.includes(mode as FarsiStudyMode)) {
    return res.status(400).json({ message: 'Ungültiger oder fehlender "mode"-Parameter.' })
  }
  const result = await farsiService.reviewCard(req.user!.id, req.params.entryId, mode as FarsiStudyMode, !!correct)
  if (!result) {
    return res.status(404).json({ message: 'Eintrag nicht gefunden' })
  }
  return res.json(result)
}

export const getBoxStats = async (req: Request, res: Response) => {
  const { mode } = req.query as { mode?: string }
  if (!mode || !STUDY_MODES.includes(mode as FarsiStudyMode)) {
    return res.status(400).json({ message: 'Ungültiger oder fehlender "mode"-Parameter.' })
  }
  const stats = await farsiService.getBoxStats(req.user!.id, mode as FarsiStudyMode)
  return res.json(stats)
}

// ── Buchstaben-Lernen ────────────────────────────────────

export const getLetterProgress = async (req: Request, res: Response) => {
  const progress = await farsiService.getLetterProgress(req.user!.id)
  return res.json({ progress })
}

export const reviewLetter = async (req: Request, res: Response) => {
  const { correct } = req.body as { correct?: boolean }
  const letterChar = decodeURIComponent(req.params.char)
  const position = req.params.position
  const result = await farsiService.reviewLetter(req.user!.id, letterChar, position, !!correct)
  return res.json(result)
}

// ── Streak ─────────────────────────────────────────────

export const getStreak = async (req: Request, res: Response) => {
  const streak = await farsiService.getStudyStreak(req.user!.id)
  return res.json(streak)
}
