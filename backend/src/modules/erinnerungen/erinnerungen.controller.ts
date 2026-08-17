import { Request, Response } from 'express'
import * as erinnerungenService from './erinnerungen.service'

// ── Reminders ────────────────────────────────────────────

export const listReminders = async (req: Request, res: Response) => {
  const reminders = await erinnerungenService.listReminders(req.user!.id)
  return res.json({ reminders })
}

export const createReminder = async (req: Request, res: Response) => {
  const reminder = await erinnerungenService.createReminder(req.user!.id, req.body)
  return res.status(201).json({ reminder })
}

export const updateReminder = async (req: Request, res: Response) => {
  const reminder = await erinnerungenService.updateReminder(req.user!.id, req.params.id, req.body)
  if (!reminder) return res.status(404).json({ message: 'Erinnerung nicht gefunden' })
  return res.json({ reminder })
}

export const deleteReminder = async (req: Request, res: Response) => {
  const deleted = await erinnerungenService.deleteReminder(req.user!.id, req.params.id)
  if (!deleted) return res.status(404).json({ message: 'Erinnerung nicht gefunden' })
  return res.status(204).send()
}

// ── Geburtstage ──────────────────────────────────────────

export const listPeople = async (req: Request, res: Response) => {
  const people = await erinnerungenService.listPeople(req.user!.id)
  return res.json({ people })
}

export const createPerson = async (req: Request, res: Response) => {
  const person = await erinnerungenService.createPerson(req.user!.id, req.body)
  return res.status(201).json({ person })
}

export const updatePerson = async (req: Request, res: Response) => {
  const person = await erinnerungenService.updatePerson(req.user!.id, req.params.id, req.body)
  if (!person) return res.status(404).json({ message: 'Person nicht gefunden' })
  return res.json({ person })
}

export const deletePerson = async (req: Request, res: Response) => {
  const deleted = await erinnerungenService.deletePerson(req.user!.id, req.params.id)
  if (!deleted) return res.status(404).json({ message: 'Person nicht gefunden' })
  return res.status(204).send()
}

export const uploadPersonPhoto = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'Keine Datei hochgeladen' })
  const person = await erinnerungenService.savePersonPhoto(req.user!.id, req.params.id, req.file.buffer)
  if (!person) return res.status(404).json({ message: 'Person nicht gefunden' })
  return res.json({ person })
}

export const setCongrats = async (req: Request, res: Response) => {
  const { year, congratulated } = req.body as { year?: number; congratulated?: boolean }
  const targetYear = year ?? new Date().getUTCFullYear()
  const result = await erinnerungenService.setCongrats(req.user!.id, req.params.id, targetYear, !!congratulated)
  if (!result) return res.status(404).json({ message: 'Person nicht gefunden' })
  return res.json({ ok: true })
}
