import type { FarsiEntry, FarsiStudyDirection, FarsiStudyMode } from '@app-types/farsi'

export const MODE_LABELS: Record<FarsiStudyMode, string> = {
  VOCAB: 'Deutsch ↔ Farsi',
  SCRIPT: 'Lautschrift ↔ Schrift',
}

export const DIRECTION_LABELS: Record<FarsiStudyMode, Record<FarsiStudyDirection, string>> = {
  VOCAB: { FORWARD: 'Deutsch → Farsi', REVERSE: 'Farsi → Deutsch', MIXED: 'Gemischt' },
  SCRIPT: { FORWARD: 'Lautschrift → Schrift', REVERSE: 'Schrift → Lautschrift', MIXED: 'Gemischt' },
}

export const DIRECTION_ORDER: FarsiStudyDirection[] = ['FORWARD', 'REVERSE', 'MIXED']

// Muss zu BOX_INTERVAL_DAYS in backend/src/modules/farsi/farsi.service.ts passen —
// reine Anzeige-Beschriftung, keine eigene Ablauflogik.
export const BOX_LABELS: Record<number, string> = {
  1: '1 Tag',
  2: '2 Tage',
  3: '4 Tage',
  4: '8 Tage',
  5: '16 Tage',
  6: '1 Monat',
  7: '3 Monate',
  8: '6 Monate',
  9: '1 Jahr',
}
export const BOX_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export type FaceSide = 'german' | 'farsi-latin' | 'farsi-script' | 'farsi-both'

export interface QueueItem {
  entry: FarsiEntry
  front: FaceSide
  back: FaceSide
}

// Nur im Modus VOCAB relevant: Wenn eine Karte sowohl Lautschrift als auch
// Originalschrift hat, werden bei fester Richtung beide zusammen als
// Lernhilfe gezeigt. Nur bei "Gemischt" wird zufällig nur eine der beiden
// gezeigt — das fordert dort stärker heraus.
function resolveFarsiSide(entry: FarsiEntry, direction: FarsiStudyDirection): FaceSide {
  const hasLatin = entry.persianLatin.length > 0
  const hasScript = !!entry.persianScript
  if (hasLatin && hasScript) {
    if (direction === 'MIXED') {
      return Math.random() < 0.5 ? 'farsi-latin' : 'farsi-script'
    }
    return 'farsi-both'
  }
  return hasScript ? 'farsi-script' : 'farsi-latin'
}

export function buildStudyQueue(
  mode: FarsiStudyMode,
  direction: FarsiStudyDirection,
  cards: FarsiEntry[],
): QueueItem[] {
  return cards.map((entry) => {
    const cardDirection: 'FORWARD' | 'REVERSE' =
      direction === 'MIXED' ? (Math.random() < 0.5 ? 'FORWARD' : 'REVERSE') : direction

    if (mode === 'VOCAB') {
      const farsiSide = resolveFarsiSide(entry, direction)
      return cardDirection === 'FORWARD'
        ? { entry, front: 'german', back: farsiSide }
        : { entry, front: farsiSide, back: 'german' }
    }

    return cardDirection === 'FORWARD'
      ? { entry, front: 'farsi-latin', back: 'farsi-script' }
      : { entry, front: 'farsi-script', back: 'farsi-latin' }
  })
}
