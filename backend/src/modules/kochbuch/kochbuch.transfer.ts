// Rezepte zwischen zwei getrennten Hub-Instanzen "mitnehmen" (z.B. lokal
// getestete Rezepte auf die Produktivinstanz übernehmen), ohne Server-Zugriff
// auf beiden Seiten zu brauchen — anders als die kochbuch:export/:import-
// npm-Skripte (die DB-zu-DB laufen und serverseitigen Zugriff auf beide
// Instanzen voraussetzen) läuft das hier komplett übers Frontend: Export
// lädt eine einzelne JSON-Datei herunter (Bilder als Base64 eingebettet,
// bewusst kein ZIP — kein zusätzliches Paket auf keiner Seite nötig), Import
// liest genau diese Datei wieder ein. Bewertungen werden NICHT mitgenommen
// (nutzergebunden, auf der Zielinstanz existieren andere Nutzer-IDs) — jede
// Person bewertet auf der neuen Instanz einfach neu.
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'
import {
  createRecipe,
  getRecipe,
  listRecipes,
  RECIPE_CATEGORIES,
  RECIPE_MEAL_TYPES,
  saveRecipePhoto,
  saveStepPhoto,
  UPLOADS_BASE,
  type RecipeCategory,
  type RecipeDTO,
  type RecipeMealType,
} from './kochbuch.service'

interface ExportedPhoto {
  data: string // Base64
  mimeType: string
}

interface ExportedRecipe {
  title: string
  subtitle: string | null
  source: string | null
  tags: string[]
  allergens: string[]
  prepTimeMinMinutes: number | null
  prepTimeMaxMinutes: number | null
  kcal: number | null
  category: RecipeCategory | null
  categoryNote: string | null
  mealType: RecipeMealType | null
  servingSizes: number[]
  pantryStaples: string[]
  ingredients: RecipeDTO['ingredients']
  steps: { stepNumber: number; title: string | null; instructions: string[]; photo: ExportedPhoto | null }[]
  note: string | null
  photo: ExportedPhoto | null
}

export interface ExportFile {
  exportedAt: string
  recipes: ExportedRecipe[]
}

async function readPhotoAsBase64(photoUrl: string | null): Promise<ExportedPhoto | null> {
  if (!photoUrl) return null
  try {
    const filePath = path.join(UPLOADS_BASE, photoUrl.replace(/^\/uploads\//, ''))
    const buffer = await fs.readFile(filePath)
    // Alle Kochbuch-Fotos werden beim Upload nach WebP konvertiert (siehe
    // saveRecipePhoto/saveStepPhoto) — Dateiendung ist daher immer bekannt.
    return { data: buffer.toString('base64'), mimeType: 'image/webp' }
  } catch {
    return null // Datei fehlt (z.B. schon gelöscht) — Export läuft trotzdem weiter, nur ohne Bild
  }
}

async function toExportedRecipe(recipe: RecipeDTO): Promise<ExportedRecipe> {
  const photo = await readPhotoAsBase64(recipe.photoUrl)
  const steps = await Promise.all(
    recipe.steps.map(async (step) => ({
      stepNumber: step.stepNumber,
      title: step.title,
      instructions: step.instructions,
      photo: await readPhotoAsBase64(step.photoUrl),
    })),
  )

  return {
    title: recipe.title,
    subtitle: recipe.subtitle,
    source: recipe.source,
    tags: recipe.tags,
    allergens: recipe.allergens,
    prepTimeMinMinutes: recipe.prepTimeMinMinutes,
    prepTimeMaxMinutes: recipe.prepTimeMaxMinutes,
    kcal: recipe.kcal,
    category: recipe.category,
    categoryNote: recipe.categoryNote,
    mealType: recipe.mealType,
    servingSizes: recipe.servingSizes,
    pantryStaples: recipe.pantryStaples,
    ingredients: recipe.ingredients,
    steps,
    note: recipe.note,
    photo,
  }
}

export async function exportAllRecipes(): Promise<ExportFile> {
  const recipes = await listRecipes({})
  const exported = await Promise.all(recipes.map(toExportedRecipe))
  return { exportedAt: new Date().toISOString(), recipes: exported }
}

// Einzelnes Rezept im selben Datei-Format wie exportAllRecipes (nur mit
// genau einem Eintrag im recipes-Array) — dieselbe Datei-Form lässt sich
// dann sowohl per Datei-Upload als auch per Copy-Paste-Textfeld importieren,
// ohne zwei getrennte Formate/Parser zu brauchen (siehe importRecipesFromFile).
export async function exportSingleRecipe(id: string): Promise<ExportFile | null> {
  const recipe = await getRecipe(id)
  if (!recipe) return null
  const exported = await toExportedRecipe(recipe)
  return { exportedAt: new Date().toISOString(), recipes: [exported] }
}

// ── Import ───────────────────────────────────────────────

const ExportedPhotoSchema = z
  .object({ data: z.string(), mimeType: z.string() })
  .nullable()

const ImportFileSchema = z.object({
  exportedAt: z.string().optional(),
  recipes: z.array(
    z.object({
      title: z.string(),
      subtitle: z.string().nullable().optional(),
      source: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
      allergens: z.array(z.string()).optional(),
      prepTimeMinMinutes: z.number().nullable().optional(),
      prepTimeMaxMinutes: z.number().nullable().optional(),
      kcal: z.number().nullable().optional(),
      category: z.enum(RECIPE_CATEGORIES as [RecipeCategory, ...RecipeCategory[]]).nullable().optional(),
      categoryNote: z.string().nullable().optional(),
      mealType: z.enum(RECIPE_MEAL_TYPES as [RecipeMealType, ...RecipeMealType[]]).nullable().optional(),
      servingSizes: z.array(z.number()),
      pantryStaples: z.array(z.string()).optional(),
      ingredients: z.array(
        z.object({
          name: z.string(),
          amounts: z.array(z.object({ servings: z.number(), amount: z.string() })),
        }),
      ),
      steps: z.array(
        z.object({
          stepNumber: z.number(),
          title: z.string().nullable(),
          instructions: z.array(z.string()),
          photo: ExportedPhotoSchema.optional(),
        }),
      ),
      note: z.string().nullable().optional(),
      photo: ExportedPhotoSchema.optional(),
    }),
  ),
})

export interface ImportFileResult {
  imported: number
  skipped: number
}

// userId = wer den Import ausführt — wird zum "hinzugefügt von" der neuen
// Rezepte auf dieser Instanz (die ursprüngliche Urheberschaft von der
// Quellinstanz lässt sich ohne gemeinsame Nutzer-IDs nicht sauber
// übernehmen, ist für den eigentlichen Zweck — Rezepte mitnehmen — auch
// nicht wichtig).
export async function importRecipesFromFile(userId: string, buffer: Buffer): Promise<ImportFileResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(buffer.toString('utf-8'))
  } catch {
    throw new Error('Datei ist kein gültiges JSON.')
  }

  const result = ImportFileSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error('Datei hat nicht das erwartete Format (kein Kochbuch-Export dieses Hubs?).')
  }
  const file = result.data
  const existingTitles = new Set((await listRecipes({})).map((r) => r.title.trim().toLowerCase()))

  let imported = 0
  let skipped = 0

  for (const recipe of file.recipes) {
    if (existingTitles.has(recipe.title.trim().toLowerCase())) {
      skipped++
      continue
    }

    const created = await createRecipe(userId, {
      title: recipe.title,
      subtitle: recipe.subtitle ?? null,
      source: recipe.source ?? null,
      tags: recipe.tags ?? [],
      allergens: recipe.allergens ?? [],
      prepTimeMinMinutes: recipe.prepTimeMinMinutes ?? null,
      prepTimeMaxMinutes: recipe.prepTimeMaxMinutes ?? null,
      kcal: recipe.kcal ?? null,
      category: recipe.category ?? null,
      categoryNote: recipe.categoryNote ?? null,
      mealType: recipe.mealType ?? null,
      servingSizes: recipe.servingSizes,
      pantryStaples: recipe.pantryStaples ?? [],
      ingredients: recipe.ingredients,
      steps: recipe.steps.map((s) => ({
        stepNumber: s.stepNumber,
        title: s.title,
        instructions: s.instructions,
        photoUrl: null,
      })),
      note: recipe.note ?? null,
    })

    if (recipe.photo) {
      await saveRecipePhoto(userId, created.id, Buffer.from(recipe.photo.data, 'base64'))
    }
    for (let i = 0; i < recipe.steps.length; i++) {
      const stepPhoto = recipe.steps[i].photo
      if (stepPhoto) {
        await saveStepPhoto(userId, created.id, i, Buffer.from(stepPhoto.data, 'base64'))
      }
    }

    existingTitles.add(recipe.title.trim().toLowerCase())
    imported++
  }

  return { imported, skipped }
}
