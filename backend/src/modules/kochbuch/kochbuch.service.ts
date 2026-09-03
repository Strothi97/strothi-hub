import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { prisma } from '../../db'

// ── Typen für die Json-Unterstrukturen (siehe schema.prisma-Kommentar) ──

export interface RecipeIngredientAmount {
  servings: number
  amount: string // Roh-String wie auf der Karte, z.B. "390 g", "1,5 **", "1"
}

export interface RecipeIngredient {
  name: string
  amounts: RecipeIngredientAmount[]
}

export interface RecipeStep {
  stepNumber: number
  title: string | null
  instructions: string[]
  photoUrl: string | null
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : []
}

function toNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? (value as number[]) : []
}

function toIngredients(value: unknown): RecipeIngredient[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const raw = item as Record<string, unknown>
    return {
      name: typeof raw.name === 'string' ? raw.name : '',
      amounts: Array.isArray(raw.amounts)
        ? (raw.amounts as Record<string, unknown>[]).map((a) => ({
            servings: typeof a.servings === 'number' ? a.servings : 0,
            amount: typeof a.amount === 'string' ? a.amount : '',
          }))
        : [],
    }
  })
}

function toSteps(value: unknown): RecipeStep[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const raw = item as Record<string, unknown>
    return {
      stepNumber: typeof raw.stepNumber === 'number' ? raw.stepNumber : 0,
      title: typeof raw.title === 'string' ? raw.title : null,
      instructions: toStringArray(raw.instructions),
      photoUrl: typeof raw.photoUrl === 'string' ? raw.photoUrl : null,
    }
  })
}

// ── DTO ──────────────────────────────────────────────────

export interface RecipeRatingDTO {
  userId: string
  userName: string
  value: number
}

export interface RecipeDTO {
  id: string
  title: string
  subtitle: string | null
  source: string | null
  tags: string[]
  allergens: string[]
  prepTimeMinMinutes: number | null
  prepTimeMaxMinutes: number | null
  kcal: number | null
  ratings: RecipeRatingDTO[]
  averageRating: number | null
  photoUrl: string | null
  servingSizes: number[]
  pantryStaples: string[]
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  note: string | null
  addedBy: string | null
  createdAt: Date
  updatedAt: Date
}

function toDTO(row: {
  id: string
  title: string
  subtitle: string | null
  source: string | null
  tags: unknown
  allergens: unknown
  prepTimeMinMinutes: number | null
  prepTimeMaxMinutes: number | null
  kcal: number | null
  photoUrl: string | null
  servingSizes: unknown
  pantryStaples: unknown
  ingredients: unknown
  steps: unknown
  note: string | null
  createdAt: Date
  updatedAt: Date
  user?: { name: string } | null
  ratings?: { userId: string; value: number; user: { name: string } }[]
}): RecipeDTO {
  const ratings = (row.ratings ?? []).map((r) => ({ userId: r.userId, userName: r.user.name, value: r.value }))
  const averageRating =
    ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length : null

  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    source: row.source,
    tags: toStringArray(row.tags),
    allergens: toStringArray(row.allergens),
    prepTimeMinMinutes: row.prepTimeMinMinutes,
    prepTimeMaxMinutes: row.prepTimeMaxMinutes,
    kcal: row.kcal,
    ratings,
    averageRating,
    photoUrl: row.photoUrl,
    servingSizes: toNumberArray(row.servingSizes),
    pantryStaples: toStringArray(row.pantryStaples),
    ingredients: toIngredients(row.ingredients),
    steps: toSteps(row.steps),
    note: row.note,
    addedBy: row.user?.name ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

const RATINGS_INCLUDE = { ratings: { include: { user: { select: { name: true } } } } } as const

interface ListFilters {
  search?: string
  tag?: string
}

// Kochbuch ist bewusst NICHT nutzerisoliert wie die übrigen Tools (siehe
// CLAUDE.md) — jeder mit Kochbuch-Zugriff (UserToolAccess, admin-gesteuert)
// sieht und bearbeitet dasselbe gemeinsame Buch, wie ein geteiltes Dokument.
// `userId` auf dem Recipe bleibt nur als "hinzugefügt von"-Info erhalten
// (addedBy im DTO), steuert aber keinen Zugriff. Kleine Datenmenge
// (Haushalts-Kochbuch) — Suche/Filter bewusst in JS statt per SQL/JSON-Query
// (gleiche Begründung wie farsi.service.ts).
export async function listRecipes(filters: ListFilters): Promise<RecipeDTO[]> {
  const rows = await prisma.recipe.findMany({
    include: { user: { select: { name: true } }, ...RATINGS_INCLUDE },
    orderBy: { title: 'asc' },
  })
  let recipes = rows.map(toDTO)

  if (filters.tag) {
    recipes = recipes.filter((r) => r.tags.includes(filters.tag!))
  }

  const needle = filters.search?.trim().toLowerCase()
  if (needle) {
    recipes = recipes.filter((r) => {
      const haystack = [r.title, r.subtitle ?? '', ...r.tags].join(' ').toLowerCase()
      return haystack.includes(needle)
    })
  }

  return recipes
}

// Alle vorkommenden Tags über sämtliche (gemeinsamen) Rezepte hinweg, für
// die Filter-Chips.
export async function listTags(): Promise<string[]> {
  const rows = await prisma.recipe.findMany({ select: { tags: true } })
  const set = new Set<string>()
  for (const row of rows) {
    for (const tag of toStringArray(row.tags)) set.add(tag)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'de'))
}

export interface RecipeInput {
  title: string
  subtitle?: string | null
  source?: string | null
  tags?: string[] | null
  allergens?: string[] | null
  prepTimeMinMinutes?: number | null
  prepTimeMaxMinutes?: number | null
  kcal?: number | null
  servingSizes: number[]
  pantryStaples?: string[] | null
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  note?: string | null
}

// userId = wer das Rezept anlegt ("hinzugefügt von"), keine Zugriffsimplikation.
export async function createRecipe(userId: string, input: RecipeInput): Promise<RecipeDTO> {
  const row = await prisma.recipe.create({
    data: {
      userId,
      title: input.title,
      subtitle: input.subtitle || null,
      source: input.source || null,
      tags: input.tags ?? [],
      allergens: input.allergens ?? [],
      prepTimeMinMinutes: input.prepTimeMinMinutes ?? null,
      prepTimeMaxMinutes: input.prepTimeMaxMinutes ?? null,
      kcal: input.kcal ?? null,
      servingSizes: input.servingSizes,
      pantryStaples: input.pantryStaples ?? [],
      ingredients: input.ingredients as unknown as object,
      steps: input.steps as unknown as object,
      note: input.note || null,
    },
    include: { user: { select: { name: true } }, ...RATINGS_INCLUDE },
  })
  return toDTO(row)
}

// Jeder mit Kochbuch-Zugriff darf jedes Rezept bearbeiten (geteiltes Buch,
// siehe listRecipes-Kommentar) — daher kein userId-Filter mehr im where.
export async function updateRecipe(id: string, input: Partial<RecipeInput>): Promise<RecipeDTO | null> {
  const existing = await prisma.recipe.findUnique({ where: { id } })
  if (!existing) return null

  const row = await prisma.recipe.update({
    where: { id },
    include: { user: { select: { name: true } }, ...RATINGS_INCLUDE },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.subtitle !== undefined && { subtitle: input.subtitle || null }),
      ...(input.source !== undefined && { source: input.source || null }),
      ...(input.tags !== undefined && { tags: input.tags ?? [] }),
      ...(input.allergens !== undefined && { allergens: input.allergens ?? [] }),
      ...(input.prepTimeMinMinutes !== undefined && { prepTimeMinMinutes: input.prepTimeMinMinutes }),
      ...(input.prepTimeMaxMinutes !== undefined && { prepTimeMaxMinutes: input.prepTimeMaxMinutes }),
      ...(input.kcal !== undefined && { kcal: input.kcal }),
      ...(input.servingSizes !== undefined && { servingSizes: input.servingSizes }),
      ...(input.pantryStaples !== undefined && { pantryStaples: input.pantryStaples ?? [] }),
      ...(input.ingredients !== undefined && { ingredients: input.ingredients as unknown as object }),
      ...(input.steps !== undefined && { steps: input.steps as unknown as object }),
      ...(input.note !== undefined && { note: input.note || null }),
    },
  })
  return toDTO(row)
}

// Einzelnes Rezept lesen (z.B. für den Rezept-Export/Kopieren-Button, wo
// nur ein Rezept statt der ganzen Liste gebraucht wird).
export async function getRecipe(id: string): Promise<RecipeDTO | null> {
  const row = await prisma.recipe.findUnique({
    where: { id },
    include: { user: { select: { name: true } }, ...RATINGS_INCLUDE },
  })
  return row ? toDTO(row) : null
}

export async function deleteRecipe(id: string): Promise<boolean> {
  const existing = await prisma.recipe.findUnique({ where: { id } })
  if (!existing) return false

  if (existing.photoUrl) {
    await deletePhotoFile(existing.photoUrl)
  }
  await prisma.recipe.delete({ where: { id } })
  return true
}

// ── Foto-Upload ──────────────────────────────────────────
// Gleiches Muster wie erinnerungen.service.ts (savePersonPhoto): pro Tool
// und Nutzer getrennter Upload-Ordner, komprimiertes WebP. Anders als beim
// runden Personenfoto aber ohne quadratischen Zuschnitt (fit: 'inside' statt
// 'cover') — ein Gericht-Foto soll nicht beschnitten werden.
export const UPLOADS_BASE = path.join(__dirname, '..', '..', '..', process.env.UPLOAD_DIR || 'uploads')
const PHOTO_UPLOAD_ROOT = path.join(UPLOADS_BASE, 'kochbuch')

async function deletePhotoFile(photoUrl: string) {
  const oldPath = path.join(UPLOADS_BASE, photoUrl.replace(/^\/uploads\//, ''))
  await fs.unlink(oldPath).catch(() => {})
}

// userId = wer den Upload macht (bestimmt nur den Speicherordner), nicht
// zwingend der ursprüngliche Ersteller — jeder mit Zugriff darf ersetzen.
export async function saveRecipePhoto(userId: string, id: string, buffer: Buffer): Promise<RecipeDTO | null> {
  const existing = await prisma.recipe.findUnique({ where: { id } })
  if (!existing) return null

  const userDir = path.join(PHOTO_UPLOAD_ROOT, userId)
  await fs.mkdir(userDir, { recursive: true })

  const filename = `${id}-${Date.now()}.webp`
  await sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(userDir, filename))

  if (existing.photoUrl) {
    await deletePhotoFile(existing.photoUrl)
  }

  const photoUrl = `/uploads/kochbuch/${userId}/${filename}`
  const row = await prisma.recipe.update({
    where: { id },
    data: { photoUrl },
    include: { user: { select: { name: true } }, ...RATINGS_INCLUDE },
  })
  return toDTO(row)
}

// Foto für einen einzelnen Zubereitungsschritt (unabhängig vom Titelbild).
// stepIndex ist die Position im steps-Array (0-basiert), nicht stepNumber —
// beide fallen normalerweise zusammen (stepNumber = index+1), aber der Index
// ist robuster gegenüber Lücken/Neunummerierung. userId hier ebenfalls nur
// für den Speicherordner, nicht für den Zugriff (siehe saveRecipePhoto).
export async function saveStepPhoto(
  userId: string,
  id: string,
  stepIndex: number,
  buffer: Buffer,
): Promise<RecipeDTO | null> {
  const existing = await prisma.recipe.findUnique({ where: { id } })
  if (!existing) return null

  const steps = toSteps(existing.steps)
  if (stepIndex < 0 || stepIndex >= steps.length) return null

  const userDir = path.join(PHOTO_UPLOAD_ROOT, userId)
  await fs.mkdir(userDir, { recursive: true })

  const filename = `${id}-step${stepIndex}-${Date.now()}.webp`
  await sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(userDir, filename))

  const oldStepPhoto = steps[stepIndex].photoUrl
  if (oldStepPhoto) {
    await deletePhotoFile(oldStepPhoto)
  }

  steps[stepIndex] = { ...steps[stepIndex], photoUrl: `/uploads/kochbuch/${userId}/${filename}` }

  const row = await prisma.recipe.update({
    where: { id },
    data: { steps: steps as unknown as object },
    include: { user: { select: { name: true } }, ...RATINGS_INCLUDE },
  })
  return toDTO(row)
}

// Bewertung ist personenbezogen: jeder mit Zugriff bewertet für sich, der
// Durchschnitt (averageRating im DTO) wird daraus berechnet, nicht
// gespeichert. value: null löscht die eigene Bewertung wieder.
export async function setRating(recipeId: string, userId: string, value: number | null): Promise<RecipeDTO | null> {
  const existing = await prisma.recipe.findUnique({ where: { id: recipeId } })
  if (!existing) return null

  if (value === null) {
    await prisma.recipeRating.deleteMany({ where: { recipeId, userId } })
  } else {
    await prisma.recipeRating.upsert({
      where: { recipeId_userId: { recipeId, userId } },
      create: { recipeId, userId, value },
      update: { value },
    })
  }

  const row = await prisma.recipe.findUniqueOrThrow({
    where: { id: recipeId },
    include: { user: { select: { name: true } }, ...RATINGS_INCLUDE },
  })
  return toDTO(row)
}
