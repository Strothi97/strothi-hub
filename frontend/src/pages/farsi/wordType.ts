import type { FarsiWordType } from '@app-types/farsi'

export const WORD_TYPE_ORDER: FarsiWordType[] = [
  'NOUN',
  'VERB',
  'ADJECTIVE',
  'ADVERB',
  'PRONOUN',
  'QUESTION_WORD',
  'PREPOSITION',
  'CONJUNCTION',
  'NUMBER',
  'PHRASE',
  'IDIOM',
  'OTHER',
]

export const WORD_TYPE_META: Record<FarsiWordType, { label: string; icon: string }> = {
  NOUN: { label: 'Nomen', icon: '🔤' },
  VERB: { label: 'Verb', icon: '🏃' },
  ADJECTIVE: { label: 'Adjektiv', icon: '🎨' },
  ADVERB: { label: 'Adverb', icon: '🕒' },
  PRONOUN: { label: 'Pronomen', icon: '👤' },
  QUESTION_WORD: { label: 'Fragewort', icon: '❓' },
  PREPOSITION: { label: 'Präposition', icon: '🔗' },
  CONJUNCTION: { label: 'Konjunktion', icon: '🔀' },
  NUMBER: { label: 'Zahl', icon: '🔢' },
  PHRASE: { label: 'Satz', icon: '💬' },
  IDIOM: { label: 'Redensart', icon: '🗣️' },
  OTHER: { label: 'Sonstiges', icon: '❔' },
}

// Alphabetisch (nach deutschem Label) statt in WORD_TYPE_ORDER — für
// Mobil-Listenansichten, in denen man einen Begriff eher alphabetisch
// sucht als in der thematischen Reihenfolge der Chip-Leiste.
export const ALPHABETICAL_TYPE_ORDER: FarsiWordType[] = [...WORD_TYPE_ORDER].sort((a, b) =>
  WORD_TYPE_META[a].label.localeCompare(WORD_TYPE_META[b].label, 'de'),
)
