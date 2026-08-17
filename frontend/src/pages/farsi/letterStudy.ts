import { PERSIAN_ALPHABET } from './alphabet'
import type { AlphabetLetter } from './alphabet'
import type { FarsiLetterProgress } from '@app-types/farsi'

export const LETTER_SESSION_SIZE = 10

export type LetterPosition = 'isolated' | 'initial' | 'medial' | 'final'

export interface LetterQueueItem {
  letter: AlphabetLetter
  position: LetterPosition
}

// Jede Position gilt als eigene Karte mit eigenem Lernfortschritt — wer
// die isolierte Form erkennt, kann bei der Mittelform trotzdem noch
// unsicher sein. Nicht-links-verbindende Buchstaben (ا د ذ ر ز ژ و)
// haben nur 2 unterscheidbare Formen (isoliert/Ende), alle anderen 4.
function letterPositions(letter: AlphabetLetter): LetterPosition[] {
  return letter.leftJoining ? ['isolated', 'initial', 'medial', 'final'] : ['isolated', 'final']
}

function allLetterForms(): LetterQueueItem[] {
  const items: LetterQueueItem[] = []
  for (const letter of PERSIAN_ALPHABET) {
    for (const position of letterPositions(letter)) {
      items.push({ letter, position })
    }
  }
  return items
}

function progressKey(letterChar: string, position: string): string {
  return `${letterChar}:${position}`
}

function isDue(progressByKey: Map<string, FarsiLetterProgress>, letterChar: string, position: LetterPosition): boolean {
  const p = progressByKey.get(progressKey(letterChar, position))
  return !p || new Date(p.dueAt).getTime() <= Date.now()
}

// Fisher-Yates — mischt in-place und gibt das Array zurück.
function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

export function buildLetterQueue(progress: FarsiLetterProgress[], limit = LETTER_SESSION_SIZE): LetterQueueItem[] {
  const progressByKey = new Map(progress.map((p) => [progressKey(p.letterChar, p.position), p]))
  const due = allLetterForms().filter((item) => isDue(progressByKey, item.letter.char, item.position))

  // Erst mischen, dann stabil nach Fälligkeit sortieren — echte
  // Überfällige bleiben vorn, aber unter gleich fälligen (z.B. "noch nie
  // geübt") ist die Reihenfolge bei jeder Sitzung neu zufällig, statt
  // immer alphabetisch (alef, be, pe, ...) zu erscheinen.
  shuffle(due)
  due.sort((a, b) => {
    const aDue = progressByKey.get(progressKey(a.letter.char, a.position))?.dueAt
    const bDue = progressByKey.get(progressKey(b.letter.char, b.position))?.dueAt
    const aTime = aDue ? new Date(aDue).getTime() : -Infinity
    const bTime = bDue ? new Date(bDue).getTime() : -Infinity
    return aTime - bTime
  })

  return due.slice(0, limit)
}

export const POSITION_LABELS: Record<LetterPosition, string> = {
  isolated: 'Isoliert',
  initial: 'Anfang',
  medial: 'Mitte',
  final: 'Ende',
}

export function getDueLetterCount(progress: FarsiLetterProgress[]): number {
  const progressByKey = new Map(progress.map((p) => [progressKey(p.letterChar, p.position), p]))
  return allLetterForms().filter((item) => isDue(progressByKey, item.letter.char, item.position)).length
}
