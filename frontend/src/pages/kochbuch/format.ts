// Formatierungs-Helfer für das Kochbuch-Tool
import type { Recipe, RecipeCategory, RecipeMealType } from '@app-types/kochbuch'

// Die 1-5-Sterne-Buckets für den Bewertungs-Filter (Rezepte.tsx) — gerundeter
// Durchschnitt (averageRating kann Nachkommastellen haben, z.B. 2,4), damit
// ein Rezept immer eindeutig genau einem Bucket zugeordnet ist.
export const RECIPE_RATING_BUCKETS = [1, 2, 3, 4, 5] as const
export function ratingBucket(averageRating: number | null): number | null {
  return averageRating === null ? null : Math.min(5, Math.max(1, Math.round(averageRating)))
}

// Icon + Anzeigename je Diät-Kategorie, an einer Stelle gepflegt (Badge in
// RezeptDetail/Rezepte, Auswahl-Chips in RezeptForm/Filter/WasKocheIchModal).
export const CATEGORY_META: Record<RecipeCategory, { label: string; icon: string }> = {
  fleisch: { label: 'Fleisch', icon: '🥩' },
  fisch: { label: 'Fisch', icon: '🐟' },
  vegetarisch: { label: 'Vegetarisch', icon: '🥕' },
  vegan: { label: 'Vegan', icon: '🌱' },
}

export const RECIPE_CATEGORIES: RecipeCategory[] = ['fleisch', 'fisch', 'vegetarisch', 'vegan']

// Icon + Anzeigename je Essensart/Gang — gleiches Muster wie CATEGORY_META.
export const MEAL_TYPE_META: Record<RecipeMealType, { label: string; icon: string }> = {
  vorspeise: { label: 'Vorspeise', icon: '🥗' },
  hauptgericht: { label: 'Hauptgericht', icon: '🍽️' },
  beilage: { label: 'Beilage', icon: '🥔' },
  dessert: { label: 'Dessert', icon: '🍰' },
  snack: { label: 'Snack', icon: '🍿' },
}

export const RECIPE_MEAL_TYPES: RecipeMealType[] = ['vorspeise', 'hauptgericht', 'beilage', 'dessert', 'snack']

// "Unfertig" ist bewusst kein eigenes DB-Feld, sondern aus vorhandenen
// Feldern abgeleitet (Wunsch: jedes Rezept soll irgendwann eine Essensart +
// eine Kategorie + ein Hauptbild haben, Zwischenschritt-Fotos bleiben
// optional) — damit kann es sich nie mit dem echten Datenstand widersprechen.
// An einer Stelle gepflegt, damit Badge (Rezepte.tsx/RezeptDetail.tsx),
// Filter (Rezepte.tsx) und Hinweistext denselben Maßstab verwenden.
// mealType ist zusätzlich ein Pflichtfeld im Formular (RezeptForm.tsx
// blockiert das Speichern ohne Auswahl) — Altbestand/Transfer-Importe ohne
// mealType tauchen hier trotzdem als "unfertig" auf, statt einen Fehler zu
// werfen.
export interface RecipeCompleteness {
  isComplete: boolean
  missing: string[] // z.B. ['Essensart', 'Kategorie', 'Hauptbild']
}

export function getCompleteness(recipe: {
  category: RecipeCategory | null
  mealType: RecipeMealType | null
  photoUrl: string | null
}): RecipeCompleteness {
  const missing: string[] = []
  if (!recipe.mealType) missing.push('Essensart')
  if (!recipe.category) missing.push('Kategorie')
  if (!recipe.photoUrl) missing.push('Hauptbild')
  return { isComplete: missing.length === 0, missing }
}

// Volltextsuche über (praktisch) alles, was an Text in einem Rezept stecken
// kann (Wunsch: auch Zutaten, Notiz, Zubereitungsschritte finden, nicht nur
// Titel/Untertitel/Tags wie bisher) — einmal gebaut statt bei jedem Zugriff
// neu zusammengesetzt, gecacht ist das für die überschaubare Rezeptmenge
// hier nicht nötig (gleiche Haltung wie die übrige clientseitige Suche).
export function searchHaystack(recipe: Recipe): string {
  return [
    recipe.title,
    recipe.subtitle ?? '',
    recipe.source ?? '',
    recipe.note ?? '',
    recipe.categoryNote ?? '',
    ...recipe.tags,
    ...recipe.allergens,
    ...recipe.pantryStaples,
    ...recipe.ingredients.map((ingredient) => ingredient.name),
    ...recipe.steps.flatMap((step) => [step.title ?? '', ...step.instructions]),
  ]
    .join(' ')
    .toLowerCase()
}

export function formatTime(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null
  if (min !== null && max !== null && min !== max) return `${min}–${max} Min`
  return `${min ?? max} Min`
}

// Für den Dateinamen beim Einzel-Rezept-Download (RezeptDetail.tsx).
export function slugify(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'rezept'
  )
}
