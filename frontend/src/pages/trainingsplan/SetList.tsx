import { formatSetValue } from './format'
import type { ExerciseUnit } from '@app-types/trainingsplan'

interface SetListProps {
  sets: { value: number | null; reps: number | null; secondaryValue?: number | null }[]
  unit: ExerciseUnit
  secondaryUnit?: ExerciseUnit | null
}

// Nummerierte Satz-Liste ("1. 8 × 70 kg", "2. 7 × 70 kg", ...) statt einer
// mit "·" verketteten Zeichenkette — Nutzer-Feedback: ohne Nummerierung war
// nicht erkennbar, dass die Werte von links nach rechts Satz 1, 2, 3 sind.
// Gemeinsam genutzt von UebungDetail (Historie), EinheitDetail (Ablauf) und
// UebungHinzufuegenModal ("Letztes Mal").
export function SetList({ sets, unit, secondaryUnit }: SetListProps) {
  return (
    <ol className="trainingsplan-set-list">
      {sets.map((set, index) => (
        <li key={index} className="trainingsplan-set-list__item">
          <span className="trainingsplan-set-list__index">{index + 1}.</span>
          <span className="trainingsplan-set-list__value">{formatSetValue(set, unit, secondaryUnit)}</span>
        </li>
      ))}
    </ol>
  )
}
