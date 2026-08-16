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
  | 'PARTICLE'
  | 'NUMBER'
  | 'PHRASE'
  | 'IDIOM'
  | 'LETTER'
  | 'OTHER'

export interface FarsiEntry {
  id: string
  german: string[]
  persianLatin: string[]
  persianScript: string | null
  type: FarsiWordType | null
  meaning: string | null
  isComplete: boolean
  missingFields: string[]
  createdAt: string
  updatedAt: string
}

export interface FarsiEntryInput {
  german: string[]
  persianLatin: string[]
  persianScript: string | null
  type: FarsiWordType | null
  meaning: string | null
}

export interface FarsiImportResult {
  imported: number
  errors: { index: number; reason: string }[]
}
