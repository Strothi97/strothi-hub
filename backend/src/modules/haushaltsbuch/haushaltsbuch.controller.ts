import { Request, Response } from 'express'
import * as service from './haushaltsbuch.service'
import { AppError } from '../../utils/appError'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function assertDate(value: unknown, feldname: string): string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new AppError(`${feldname} muss ein gültiges Datum sein (JJJJ-MM-TT).`, 400)
  }
  return value
}

function assertName(value: unknown, feldname: string): string {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name) throw new AppError(`${feldname} darf nicht leer sein.`, 400)
  if (name.length > 60) throw new AppError(`${feldname} ist zu lang.`, 400)
  return name
}

function assertAmount(value: unknown, feldname: string): number {
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount)) throw new AppError(`${feldname} muss eine Zahl sein.`, 400)
  return Math.round(amount * 100) / 100
}

function assertOptionalId(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') throw new AppError('Ungültige Auswahl.', 400)
  return value
}

function assertBoolean(value: unknown, feldname: string): boolean {
  if (typeof value !== 'boolean') throw new AppError(`${feldname} ist ungültig.`, 400)
  return value
}

const KATEGORIE_TYPEN = ['EINNAHME', 'AUSGABE'] as const

function assertChoice<T extends string>(value: unknown, erlaubt: readonly T[], feldname: string): T {
  if (typeof value !== 'string' || !(erlaubt as readonly string[]).includes(value)) {
    throw new AppError(`${feldname} ist ungültig.`, 400)
  }
  return value as T
}

// ── Kasse ──

export const getKasse = async (req: Request, res: Response) => {
  return res.json({ kasse: await service.getKasse(req.user!.id) })
}

export const setKasse = async (req: Request, res: Response) => {
  const kasse = await service.setKasse(req.user!.id, {
    startbetrag: assertAmount(req.body?.startbetrag ?? 0, 'Startbetrag'),
    startdatum: assertDate(req.body?.startdatum, 'Startdatum'),
  })
  return res.json({ kasse })
}

// ── Kategorien ──

export const listKategorien = async (req: Request, res: Response) => {
  return res.json({ kategorien: await service.listKategorien(req.user!.id) })
}

export const createKategorie = async (req: Request, res: Response) => {
  await service.createKategorie(req.user!.id, {
    name: assertName(req.body?.name, 'Kategoriename'),
    typ: assertChoice(req.body?.typ, KATEGORIE_TYPEN, 'Kategorietyp'),
    parentId: assertOptionalId(req.body?.parentId),
    inStatistik: req.body?.inStatistik === undefined ? true : assertBoolean(req.body.inStatistik, 'Statistik'),
  })
  return res.status(201).json({ ok: true })
}

export const updateKategorie = async (req: Request, res: Response) => {
  const input: { name?: string; inStatistik?: boolean } = {}
  if (req.body?.name !== undefined) input.name = assertName(req.body.name, 'Kategoriename')
  if (req.body?.inStatistik !== undefined) input.inStatistik = assertBoolean(req.body.inStatistik, 'Statistik')
  const ok = await service.updateKategorie(req.user!.id, req.params.id, input)
  if (!ok) return res.status(404).json({ message: 'Kategorie nicht gefunden' })
  return res.json({ ok: true })
}

export const sortiereKategorien = async (req: Request, res: Response) => {
  const ids = req.body?.ids
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string')) {
    throw new AppError('Ungültige Reihenfolge.', 400)
  }
  await service.sortiereKategorien(req.user!.id, ids as string[])
  return res.json({ ok: true })
}

export const deleteKategorie = async (req: Request, res: Response) => {
  const ok = await service.deleteKategorie(req.user!.id, req.params.id)
  if (!ok) return res.status(404).json({ message: 'Kategorie nicht gefunden' })
  return res.status(204).send()
}

// ── Buchungen ──

function buchungInput(body: Record<string, unknown> | undefined): service.BuchungInput {
  return {
    datum: assertDate(body?.datum, 'Datum'),
    betrag: assertAmount(body?.betrag, 'Betrag'),
    kategorieId: assertOptionalId(body?.kategorieId) ?? '',
    haendler: typeof body?.haendler === 'string' ? body.haendler : null,
    notiz: typeof body?.notiz === 'string' ? body.notiz : null,
  }
}

export const listBuchungen = async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>
  const buchungen = await service.listBuchungen(req.user!.id, {
    von: q.von,
    bis: q.bis,
    kategorieId: q.kategorieId,
    suche: q.suche,
  })
  return res.json({ buchungen })
}

export const createBuchung = async (req: Request, res: Response) => {
  await service.createBuchung(req.user!.id, buchungInput(req.body))
  return res.status(201).json({ ok: true })
}

export const createBuchungen = async (req: Request, res: Response) => {
  const items = req.body?.items
  if (!Array.isArray(items) || items.length === 0) throw new AppError('Keine Buchungen angegeben.', 400)
  if (items.length > 100) throw new AppError('Höchstens 100 Buchungen auf einmal.', 400)
  const anzahl = await service.createBuchungen(req.user!.id, items.map((item) => buchungInput(item as Record<string, unknown>)))
  return res.status(201).json({ anzahl })
}

export const updateBuchung = async (req: Request, res: Response) => {
  const ok = await service.updateBuchung(req.user!.id, req.params.id, buchungInput(req.body))
  if (!ok) return res.status(404).json({ message: 'Buchung nicht gefunden' })
  return res.json({ ok: true })
}

export const deleteBuchung = async (req: Request, res: Response) => {
  const ok = await service.deleteBuchung(req.user!.id, req.params.id)
  if (!ok) return res.status(404).json({ message: 'Buchung nicht gefunden' })
  return res.status(204).send()
}

// ── Auswertungen ──

export const monatsUebersicht = async (req: Request, res: Response) => {
  const jahr = Number(req.query.jahr)
  const monat = Number(req.query.monat)
  if (!Number.isInteger(jahr) || !Number.isInteger(monat) || monat < 1 || monat > 12) {
    throw new AppError('Jahr und Monat sind ungültig.', 400)
  }
  return res.json({ uebersicht: await service.monatsUebersicht(req.user!.id, jahr, monat) })
}

export const jahresUebersicht = async (req: Request, res: Response) => {
  const jahr = Number(req.query.jahr)
  if (!Number.isInteger(jahr)) throw new AppError('Das Jahr ist ungültig.', 400)
  return res.json({ uebersicht: await service.jahresUebersicht(req.user!.id, jahr) })
}
