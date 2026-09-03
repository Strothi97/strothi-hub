// Typen für das Tool "Kochbuch"

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

export interface RecipeRatingEntry {
  userId: string
  userName: string
  value: number
}

// Grobe Diät-Kategorie (Wunsch: auf einen Blick/beim Filtern sehen, ob ein
// Rezept z.B. vegetarisch ist) — eigenes, eingeschränktes Feld statt ein
// weiterer freier Tag. null = keine Angabe.
export type RecipeCategory = 'fleisch' | 'fisch' | 'vegetarisch' | 'vegan'

// Essensart/Gang — anders als category ein Pflichtfeld im Formular (Wunsch:
// jedes Rezept soll wissen, ob es z.B. Vorspeise oder Hauptgericht ist).
// null nur bei Altbestand/Transfer-Import ohne Angabe.
export type RecipeMealType = 'vorspeise' | 'hauptgericht' | 'beilage' | 'dessert' | 'snack'

export interface Recipe {
  id: string
  title: string
  subtitle: string | null
  source: string | null
  tags: string[]
  allergens: string[]
  prepTimeMinMinutes: number | null
  prepTimeMaxMinutes: number | null
  kcal: number | null
  category: RecipeCategory | null
  // Freie "Erweiterung" zur Kategorie, z.B. "geht auch vegetarisch, wenn
  // man Hähnchen durch Tofu ersetzt".
  categoryNote: string | null
  mealType: RecipeMealType | null
  // Bewertung ist personenbezogen (siehe Gespräch) — jede/r im geteilten
  // Kochbuch bewertet für sich, averageRating wird daraus berechnet.
  ratings: RecipeRatingEntry[]
  averageRating: number | null
  photoUrl: string | null
  servingSizes: number[]
  pantryStaples: string[]
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  note: string | null
  // Name des Nutzers, der das Rezept angelegt hat — reine Info, das
  // Kochbuch ist für alle mit Zugriff gemeinsam les-/schreibbar.
  addedBy: string | null
  createdAt: string
  updatedAt: string
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
  category?: RecipeCategory | null
  categoryNote?: string | null
  mealType?: RecipeMealType | null
  servingSizes: number[]
  pantryStaples?: string[] | null
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  note?: string | null
}

// Ergebnis des KI-Foto-Imports (noch ungespeichert) — wie RecipeInput, aber
// ohne Felder, die der Import nicht liefert (Fotos, Bewertung, Quelle/Notiz
// sind manuelle Angaben) und ohne photoUrl je Schritt.
export interface ImportedRecipe {
  title: string
  subtitle: string | null
  category: RecipeCategory | null
  mealType: RecipeMealType | null
  tags: string[]
  allergens: string[]
  prepTimeMinMinutes: number | null
  prepTimeMaxMinutes: number | null
  kcal: number | null
  servingSizes: number[]
  pantryStaples: string[]
  ingredients: RecipeIngredient[]
  steps: { stepNumber: number; title: string | null; instructions: string[] }[]
}

// Token-Nutzung/geschätzte Kosten einer Foto-Analyse (Kostenbewusstsein-Wunsch).
export interface ImportUsage {
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
}

// Export-Datei zum Mitnehmen der Rezepte zwischen zwei Hub-Instanzen (siehe
// Gespräch) — Struktur ähnlich Recipe, aber mit eingebetteten Fotos (Base64)
// statt photoUrl. Wird im Frontend nur durchgereicht (Download/Upload),
// nicht inhaltlich interpretiert, daher lose typisiert.
export interface ExportFile {
  exportedAt: string
  recipes: Record<string, unknown>[]
}
