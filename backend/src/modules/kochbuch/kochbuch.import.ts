import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { AppError } from '../../utils/appError'

// Separater API-Key, NIE der gleiche wie ein evtl. genutzter Claude-Abo-Zugang
// (siehe Gespräch mit Felix) — reines Pay-per-Use, Budget-Limit wird im
// Anthropic-Console auf den Key selbst gesetzt, nicht hier im Code.
// Läuft ausschließlich serverseitig (wie SMTP/VAPID-Keys), nie im Frontend.
export function isImportConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

// Struktur bewusst deckungsgleich mit ReminderInput/RecipeInput (siehe
// kochbuch.service.ts) — Fotos sind hier ausgenommen: das automatische
// Zuschneiden einzelner Zutaten-/Schritt-Bilder aus dem Kartenfoto ist ein
// eigenständiges, unzuverlässiges Bildverarbeitungsproblem und bewusst nicht
// Teil des Imports (siehe Gespräch) — Fotos bleiben manueller Upload.
const ImportedIngredientSchema = z.object({
  name: z.string().describe('Name der Zutat, z.B. "Aubergine" oder \'Gewürzmischung "Hello Souflaki"\''),
  amounts: z
    .array(
      z.object({
        servings: z.number().describe('Personenzahl dieser Spalte, z.B. 2'),
        amount: z
          .string()
          .describe('Mengenangabe genau wie auf der Karte abgedruckt, inkl. Einheit und Fußnoten-Sternchen, z.B. "1,5 **" oder "390 g"'),
      }),
    )
    .describe('Eine Mengenangabe pro Personenzahl-Spalte der Karte'),
})

const ImportedStepSchema = z.object({
  stepNumber: z.number(),
  title: z.string().nullable().describe('Kurze fettgedruckte Überschrift des Schritts, falls vorhanden'),
  instructions: z.array(z.string()).describe('Ein Array-Eintrag pro Satz/Anweisungszeile dieses Schritts'),
})

const ImportedRecipeSchema = z.object({
  title: z.string(),
  subtitle: z.string().nullable().describe('Zusatzzeile unter dem Titel, z.B. "dazu frischer Salat" — sonst null'),
  category: z
    .enum(['fleisch', 'fisch', 'vegetarisch', 'vegan'])
    .nullable()
    .describe(
      'Diät-Kategorie anhand der Zutaten: "fleisch" bei Fleisch/Geflügel, "fisch" bei Fisch/Meeresfrüchten, ' +
        '"vegetarisch" bei Ei/Milchprodukten aber ohne Fleisch/Fisch, "vegan" ohne jegliche Tierprodukte. ' +
        'Bei Unklarheit null statt zu raten.',
    ),
  mealType: z
    .enum(['vorspeise', 'hauptgericht', 'beilage', 'dessert', 'snack'])
    .nullable()
    .describe(
      'Gang/Essensart des Gerichts. Diese Rezeptkarten sind fast immer komplette Hauptgerichte — "hauptgericht" ' +
        'ist daher der naheliegende Standard, außer es ist klar erkennbar eine Vorspeise, Beilage, ein Dessert ' +
        'oder ein Snack (z.B. Süßspeise, kleine Portion als Beilage gedacht). Bei echter Unklarheit null statt zu raten.',
    ),
  tags: z.array(z.string()).describe('Kurze Schlagwort-Chips unter dem Titel, z.B. "Vegetarisch", "Viel Gemüse"'),
  allergens: z.array(z.string()).describe('Allergene aus der Fußnoten-Legende, ausgeschriebener Name ohne Nummer'),
  prepTimeMinMinutes: z.number().nullable().describe('Untere Grenze der Zubereitungszeit in Minuten, z.B. 40 bei "40–50 Min"'),
  prepTimeMaxMinutes: z.number().nullable().describe('Obere Grenze, z.B. 50 bei "40–50 Min" — bei nur einer Zeitangabe gleich min setzen'),
  kcal: z.number().nullable().describe('Kalorien pro Portion'),
  servingSizes: z.array(z.number()).describe('Die Personenzahlen-Spalten der Zutatentabelle, z.B. [2, 3, 4]'),
  pantryStaples: z.array(z.string()).describe('"Basiszutaten aus Deiner Küche" — nicht mitgelieferte Vorratsartikel wie Salz, Öl, Pfeffer'),
  ingredients: z.array(ImportedIngredientSchema),
  steps: z.array(ImportedStepSchema),
})

export type ImportedRecipe = z.infer<typeof ImportedRecipeSchema>

export interface ImportUsage {
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
}

// Preise für claude-opus-5, Stand der API-Doku dieser Session (siehe
// claude-api-Skill, Tabelle "Current Models") — grobe Schätzung fürs Auge,
// keine exakte Abrechnung (die läuft über die Anthropic-Konsole selbst).
const PRICE_PER_MTOK_INPUT_USD = 5
const PRICE_PER_MTOK_OUTPUT_USD = 25

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * PRICE_PER_MTOK_INPUT_USD + (outputTokens / 1_000_000) * PRICE_PER_MTOK_OUTPUT_USD
}

const PHOTO_PROMPT = `Du bekommst zwei Fotos einer HelloFresh-Rezeptkarte: Vorderseite (Gerichtname, Untertitel, Tags, Zeit/kcal, großes Foto) und Rückseite (Zutatentabelle über mehrere Personenzahlen, "Basiszutaten aus Deiner Küche", nummerierte Zubereitungsschritte, Allergen-Legende unten).

Extrahiere die Rezeptdaten strukturiert. Wichtig:
- Übernimm Mengenangaben exakt wie abgedruckt (inkl. Einheit, Komma-Schreibweise und Fußnoten-Sternchen wie "**"), rechne nichts um.
- Die Kartennummer (z.B. eine Zahl in einem grünen Kreis) ist NICHT Teil des Rezepts und wird ignoriert.
- Erfinde keine Felder, die auf der Karte nicht zu erkennen sind — nutze null bzw. ein leeres Array.
- Zubereitungsschritte: ein instructions-Eintrag pro einzelnem Satz/Zeile, nicht ein einziger langer Block.`

const TEXT_PROMPT = `Du bekommst den (aus HTML extrahierten) Text einer Rezept-Detailseite, z.B. von hellofresh.de. Er enthält meist Titel, Untertitel, Zeit-/Kalorienangaben, Schwierigkeitsgrad, Zutatenliste (oft für eine feste Personenzahl, manchmal mit einer Auswahl wie "pro Portion"/"pro 100g"), einen Abschnitt "Nicht in Deiner Lieferung enthalten" (Basiszutaten), eine Allergen-Liste und eine Zubereitungsanleitung mit nummerierten Schritten.

Extrahiere die Rezeptdaten strukturiert. Wichtig:
- Übernimm Mengenangaben exakt wie im Text (inkl. Einheit), rechne nichts um. Ist nur eine Personenzahl angegeben, hat servingSizes genau einen Eintrag.
- Einen Schwierigkeitsgrad (z.B. "Mittel") falls vorhanden als zusätzlichen Tag aufnehmen.
- Erfinde keine Felder, die im Text nicht vorkommen — nutze null bzw. ein leeres Array.
- Zubereitungsschritte: ein instructions-Eintrag pro einzelnem Satz/Zeile, nicht ein einziger langer Block. Fehlen die Zubereitungsschritte im Text komplett (z.B. weil sie auf der Seite hinter einem Klick versteckt waren), lass steps als leeres Array statt zu raten.
- Ignoriere Navigations-/Werbetext, Cookie-Hinweise, Teilen-/Download-Buttons und ähnliches, das nichts mit dem Rezept selbst zu tun hat.`

export interface AnalyzeResult {
  recipe: ImportedRecipe
  usage: ImportUsage
}

async function runExtraction(content: Anthropic.MessageCreateParams['messages'][0]['content']): Promise<AnalyzeResult> {
  if (!isImportConfigured()) {
    throw new AppError(
      'Kein Anthropic-API-Key konfiguriert (ANTHROPIC_API_KEY in der .env fehlt) — der Import ist noch nicht eingerichtet.',
      503,
    )
  }

  const client = new Anthropic()

  const response = await client.messages.parse({
    model: 'claude-opus-5',
    max_tokens: 8000,
    messages: [{ role: 'user', content }],
    output_config: {
      format: zodOutputFormat(ImportedRecipeSchema),
    },
  })

  if (!response.parsed_output) {
    throw new AppError('Das Rezept konnte nicht ausgelesen werden. Bitte Eingabe prüfen und erneut versuchen.', 422)
  }

  const inputTokens = response.usage?.input_tokens ?? 0
  const outputTokens = response.usage?.output_tokens ?? 0

  return {
    recipe: response.parsed_output,
    usage: {
      inputTokens,
      outputTokens,
      estimatedCostUsd: estimateCost(inputTokens, outputTokens),
    },
  }
}

// Zwei Kartenfotos (Vorder-/Rückseite) an Claude schicken und als
// strukturiertes Rezept zurückbekommen — noch NICHT gespeichert, der
// Nutzer prüft/korrigiert das Ergebnis im Formular vor dem Speichern
// (siehe Import.tsx, "Gegenprüfung und händische Nacharbeit"). Gibt zusätzlich
// die Token-Nutzung/geschätzten Kosten zurück (Wunsch: Kostenbewusstsein).
export async function analyzeRecipePhotos(
  front: { buffer: Buffer; mimeType: string },
  back: { buffer: Buffer; mimeType: string },
): Promise<AnalyzeResult> {
  return runExtraction([
    { type: 'text', text: PHOTO_PROMPT },
    { type: 'text', text: 'Vorderseite:' },
    {
      type: 'image',
      source: { type: 'base64', media_type: front.mimeType as 'image/jpeg', data: front.buffer.toString('base64') },
    },
    { type: 'text', text: 'Rückseite:' },
    {
      type: 'image',
      source: { type: 'base64', media_type: back.mimeType as 'image/jpeg', data: back.buffer.toString('base64') },
    },
  ])
}

const MAX_HTML_LENGTH = 300_000 // Sicherheitsnetz gegen versehentlich riesige Pastes

// Groben Tag-Strip statt vollem HTML-Parser (keine neue Abhängigkeit nötig) —
// bei den stark verschachtelten, klassennamen-lastigen React-Seiten (siehe
// Gespräch: HelloFresh-Website) spart das massiv Tokens gegenüber rohem HTML,
// ohne die für die Extraktion relevanten sichtbaren Texte zu verlieren.
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(h1|h2|h3|h4|p|div|li|tr|br)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

// Text/HTML einer Rezept-Webseite (statt Fotos) an Claude schicken — deutlich
// günstiger als zwei Bilder (reiner Text statt Bild-Tokens) und potenziell
// genauer, da es exakter Quelltext statt eines aus einem Foto gelesenen
// Textes ist. Gleiches Schema/Rückgabeformat wie analyzeRecipePhotos, landet
// genauso zur Prüfung im Formular statt direkt in der Datenbank.
export async function analyzeRecipeHtml(html: string): Promise<AnalyzeResult> {
  if (html.length > MAX_HTML_LENGTH) {
    throw new AppError(`Eingabe ist zu lang (max. ${MAX_HTML_LENGTH.toLocaleString('de-DE')} Zeichen).`, 400)
  }
  const text = htmlToText(html)
  if (!text) {
    throw new AppError('Kein auswertbarer Text gefunden — bitte den HTML-Quelltext der Seite einfügen.', 400)
  }
  return runExtraction([
    { type: 'text', text: TEXT_PROMPT },
    { type: 'text', text },
  ])
}
