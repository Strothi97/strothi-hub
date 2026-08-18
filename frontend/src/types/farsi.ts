// Typen für das Tool "Farsi lernen"

export type FarsiWordType =
  | 'NOUN'
  | 'VERB'
  | 'ADJECTIVE'
  | 'ADVERB'
  | 'PRONOUN'
  | 'QUESTION_WORD'
  | 'PREPOSITION'
  | 'CONJUNCTION'
  | 'NUMBER'
  | 'PHRASE'
  | 'IDIOM'
  | 'OTHER'

export interface FarsiEntry {
  id: string
  german: string[]
  persianLatin: string[]
  persianScript: string | null
  type: FarsiWordType | null
  meaning: string | null
  verbStemLatin: string | null
  verbStemScript: string | null
  isComplete: boolean
  missingFields: string[]
  createdAt: string
  updatedAt: string
  vocabBox: number | null
}

export interface FarsiEntryInput {
  german: string[]
  persianLatin: string[]
  persianScript: string | null
  type: FarsiWordType | null
  meaning: string | null
  verbStemLatin: string | null
  verbStemScript: string | null
}

export interface FarsiImportResult {
  imported: number
  errors: { index: number; reason: string }[]
}

// ── Karteikarten (Leitner-System) ─────────────────────

export type FarsiStudyMode = 'VOCAB' | 'SCRIPT'
export type FarsiStudyDirection = 'FORWARD' | 'REVERSE' | 'MIXED'
// UI-Modus im Karteikarten-Screen — 'LETTERS' hat kein Gegenstück im
// Backend-Enum FarsiStudyMode, da Buchstaben eine eigene, direktions-
// lose Übung ohne Deutsch/Farsi-Paar sind (eigene Endpunkte).
export type FarsiKarteikartenMode = FarsiStudyMode | 'LETTERS'

export interface FarsiStudySession {
  dueCount: number
  ineligibleCount: number
  cards: FarsiEntry[]
}

export interface FarsiReviewResult {
  box: number
  dueAt: string
}

export interface FarsiBoxStats {
  eligibleCount: number
  ineligibleCount: number
  newCount: number
  byBox: Record<number, number>
}

export interface FarsiLetterProgress {
  letterChar: string
  position: string
  box: number
  dueAt: string
  lastReviewedAt: string | null
}

export interface FarsiStreak {
  currentStreak: number
  longestStreak: number
}
