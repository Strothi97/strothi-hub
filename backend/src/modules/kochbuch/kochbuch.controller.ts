import { Request, Response } from 'express'
import * as kochbuchService from './kochbuch.service'
import { analyzeRecipePhotos, isImportConfigured } from './kochbuch.import'
import { AppError } from '../../utils/appError'

export const listRecipes = async (req: Request, res: Response) => {
  const { search, tag } = req.query as { search?: string; tag?: string }
  const recipes = await kochbuchService.listRecipes({ search, tag })
  return res.json({ recipes })
}

export const listTags = async (_req: Request, res: Response) => {
  const tags = await kochbuchService.listTags()
  return res.json({ tags })
}

export const createRecipe = async (req: Request, res: Response) => {
  const recipe = await kochbuchService.createRecipe(req.user!.id, req.body)
  return res.status(201).json({ recipe })
}

export const updateRecipe = async (req: Request, res: Response) => {
  const recipe = await kochbuchService.updateRecipe(req.params.id, req.body)
  if (!recipe) return res.status(404).json({ message: 'Rezept nicht gefunden' })
  return res.json({ recipe })
}

export const deleteRecipe = async (req: Request, res: Response) => {
  const deleted = await kochbuchService.deleteRecipe(req.params.id)
  if (!deleted) return res.status(404).json({ message: 'Rezept nicht gefunden' })
  return res.status(204).send()
}

export const uploadRecipePhoto = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'Keine Datei hochgeladen' })
  const recipe = await kochbuchService.saveRecipePhoto(req.user!.id, req.params.id, req.file.buffer)
  if (!recipe) return res.status(404).json({ message: 'Rezept nicht gefunden' })
  return res.json({ recipe })
}

export const uploadStepPhoto = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'Keine Datei hochgeladen' })
  const stepIndex = Number(req.params.index)
  if (!Number.isInteger(stepIndex)) return res.status(400).json({ message: 'Ungültiger Schritt-Index' })
  const recipe = await kochbuchService.saveStepPhoto(req.user!.id, req.params.id, stepIndex, req.file.buffer)
  if (!recipe) return res.status(404).json({ message: 'Rezept oder Schritt nicht gefunden' })
  return res.json({ recipe })
}

export const rateRecipe = async (req: Request, res: Response) => {
  const { value } = req.body as { value: number | null }
  if (value !== null && (typeof value !== 'number' || value < 0 || value > 5)) {
    throw new AppError('Bewertung muss zwischen 0 und 5 liegen (oder null zum Löschen).', 400)
  }
  const recipe = await kochbuchService.setRating(req.params.id, req.user!.id, value)
  if (!recipe) return res.status(404).json({ message: 'Rezept nicht gefunden' })
  return res.json({ recipe })
}

export const importStatus = async (_req: Request, res: Response) => {
  return res.json({ configured: isImportConfigured() })
}

export const analyzeImport = async (req: Request, res: Response) => {
  const files = req.files as { front?: Express.Multer.File[]; back?: Express.Multer.File[] } | undefined
  const front = files?.front?.[0]
  const back = files?.back?.[0]
  if (!front || !back) {
    throw new AppError('Bitte je ein Foto für Vorder- und Rückseite hochladen.', 400)
  }
  const { recipe, usage } = await analyzeRecipePhotos(
    { buffer: front.buffer, mimeType: front.mimetype },
    { buffer: back.buffer, mimeType: back.mimetype },
  )
  return res.json({ recipe, usage })
}
