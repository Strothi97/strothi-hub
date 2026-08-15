import { Request, Response } from 'express'
import { Bundesland, WorkDayStatus } from '@prisma/client'
import * as homeofficeService from './homeoffice.service'
import { toISODate } from './date-utils'

export const getWeek = async (req: Request, res: Response) => {
  const date = (req.query.date as string) || toISODate(new Date())
  const week = await homeofficeService.getWeek(req.user!.id, date)
  return res.json(week)
}

export const setDay = async (req: Request, res: Response) => {
  const { date, status } = req.body as { date: string; status: WorkDayStatus | null }
  await homeofficeService.setDay(req.user!.id, date, status)
  const day = await homeofficeService.getDay(req.user!.id, date)
  return res.json({ day })
}

export const getMonth = async (req: Request, res: Response) => {
  const now = new Date()
  const year = Number(req.query.year) || now.getFullYear()
  const month = Number(req.query.month) || now.getMonth() + 1
  const data = await homeofficeService.getMonth(req.user!.id, year, month)
  return res.json(data)
}

export const getYear = async (req: Request, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear()
  const data = await homeofficeService.getYearAggregation(req.user!.id, year)
  return res.json(data)
}

export const listAdjustments = async (req: Request, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear()
  const adjustments = await homeofficeService.listAdjustments(req.user!.id, year)
  return res.json({ adjustments })
}

export const createAdjustment = async (req: Request, res: Response) => {
  const { year, amount, reason } = req.body as { year: number; amount: number; reason: string }
  const adjustment = await homeofficeService.createAdjustment(req.user!.id, { year, amount, reason })
  return res.status(201).json({ adjustment })
}

export const deleteAdjustment = async (req: Request, res: Response) => {
  await homeofficeService.deleteAdjustment(req.user!.id, req.params.id)
  return res.status(204).send()
}

export const listStates = async (req: Request, res: Response) => {
  const states = await homeofficeService.listStates(req.user!.id)
  return res.json({ states })
}

export const addState = async (req: Request, res: Response) => {
  const { state, validFrom } = req.body as { state: Bundesland; validFrom: string }
  const created = await homeofficeService.addState(req.user!.id, { state, validFrom })
  return res.status(201).json({ state: created })
}

export const deleteState = async (req: Request, res: Response) => {
  await homeofficeService.deleteState(req.user!.id, req.params.id)
  return res.status(204).send()
}
