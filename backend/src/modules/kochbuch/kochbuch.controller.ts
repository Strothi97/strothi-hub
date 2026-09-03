import { Request, Response } from 'express'
import * as kochbuchService from './kochbuch.service'
import { analyzeRecipeHtml, analyzeRecipePhotos, isImportConfigured } from './kochbuch.import'
import { exportAllRecipes, exportSingleRecipe, importRecipesFromFile } from './kochbuch.transfer'
import { AppError } from '../../utils/appError'

export const listRecipes = async (req: Request, res: Response) => {
  const { search, tag, category, mealType } = req.query as {
    search?: string
    tag?: string
    category?: string
    mealType?: string
  }
  const parsedCategory = category && (kochbuchService.RECIPE_CATEGORIES as string[]).includes(category)
    ? (category as kochbuchService.RecipeCategory)
    : undefined
  const parsedMealType = mealType && (kochbuchService.RECIPE_MEAL_TYPES as string[]).includes(mealType)
    ? (mealType as kochbuchService.RecipeMealType)
    : undefined
  const recipes = await kochbuchService.listRecipes({ search, tag, category: parsedCategory, mealType: parsedMealType })
  return res.json({ recipes })
}

export const listTags = async (_req: Request, res: Response) => {
  const tags = await kochbuchService.listTags()
  return res.json({ tags })
}

// category/mealType kommen aus einer festen Auswahl im Formular (siehe
// RezeptForm.tsx) — trotzdem serverseitig geprüft, damit kein beliebiger
// String in der DB landet (gleiche Haltung wie die value-Prüfung in
// rateRecipe unten). mealType ist im Formular ein Pflichtfeld, wird hier
// aber wie category nur bei Vorhandensein geprüft (nicht erzwungen) — die
// Pflicht gilt fürs manuelle Anlegen/Bearbeiten, nicht für Transfer-Importe
// von Altbestand ohne mealType (siehe kochbuch.transfer.ts).
function assertValidChoice(value: unknown, allowed: readonly string[], label: string): void {
  if (value !== undefined && value !== null && !allowed.includes(value as string)) {
    throw new AppError(`${label} muss eine von ${allowed.join(', ')} sein (oder leer).`, 400)
  }
}

export const createRecipe = async (req: Request, res: Response) => {
  assertValidChoice(req.body?.category, kochbuchService.RECIPE_CATEGORIES, 'Kategorie')
  assertValidChoice(req.body?.mealType, kochbuchService.RECIPE_MEAL_TYPES, 'Essensart')
  const recipe = await kochbuchService.createRecipe(req.user!.id, req.body)
  return res.status(201).json({ recipe })
}

export const updateRecipe = async (req: Request, res: Response) => {
  assertValidChoice(req.body?.category, kochbuchService.RECIPE_CATEGORIES, 'Kategorie')
  assertValidChoice(req.body?.mealType, kochbuchService.RECIPE_MEAL_TYPES, 'Essensart')
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

export const analyzeTextImport = async (req: Request, res: Response) => {
  const { html } = req.body as { html?: string }
  if (!html || !html.trim()) {
    throw new AppError('Bitte den Seitentext bzw. HTML-Quelltext einfügen.', 400)
  }
  const { recipe, usage } = await analyzeRecipeHtml(html)
  return res.json({ recipe, usage })
}

// Rezepte "mitnehmen" zwischen zwei getrennten Hub-Instanzen (siehe
// kochbuch.transfer.ts) — eine JSON-Datei mit allen Rezepten inkl. Fotos
// (Base64), zum Download auf der einen und Upload auf der anderen Instanz.
export const exportRecipesFile = async (_req: Request, res: Response) => {
  const file = await exportAllRecipes()
  return res.json(file)
}

export const importRecipesFile = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'Keine Datei hochgeladen' })
  try {
    const result = await importRecipesFromFile(req.user!.id, req.file.buffer)
    return res.json(result)
  } catch (error) {
    throw new AppError(error instanceof Error ? error.message : 'Import fehlgeschlagen.', 400)
  }
}

// Ein einzelnes Rezept exportieren (Download-/Kopieren-Button auf der
// Rezeptkarte) — gleiches Datei-Format wie exportRecipesFile, nur mit genau
// einem Eintrag im recipes-Array (siehe kochbuch.transfer.ts).
export const exportSingleRecipeFile = async (req: Request, res: Response) => {
  const file = await exportSingleRecipe(req.params.id)
  if (!file) return res.status(404).json({ message: 'Rezept nicht gefunden' })
  return res.json(file)
}

// Ein per Copy-Paste eingefügtes Rezept-JSON importieren (Gegenstück zum
// Kopieren-Button) — nutzt denselben Parser/dieselbe Import-Logik wie der
// Datei-Import, nur dass der Text direkt im Body statt als Datei-Upload kommt.
export const importRecipesText = async (req: Request, res: Response) => {
  const { json } = req.body as { json?: string }
  if (!json || !json.trim()) {
    throw new AppError('Bitte den kopierten Rezept-Text einfügen.', 400)
  }
  try {
    const result = await importRecipesFromFile(req.user!.id, Buffer.from(json, 'utf-8'))
    return res.json(result)
  } catch (error) {
    throw new AppError(error instanceof Error ? error.message : 'Import fehlgeschlagen.', 400)
  }
}
