import { Request, Response } from 'express'
import { FarsiWordType } from '@prisma/client'
import * as farsiService from './farsi.service'

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
