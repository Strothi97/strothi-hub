import { Button } from '@components/ui/Button'
import { buildForms } from './alphabet'
import type { AlphabetLetter } from './alphabet'
import { POSITION_LABELS } from './letterStudy'
import type { LetterPosition } from './letterStudy'

function glyphForPosition(letter: AlphabetLetter, position: LetterPosition): string {
  const forms = buildForms(letter)
  return forms[position]
}

interface LetterStudyCardProps {
  letter: AlphabetLetter
  position: LetterPosition
  flipped: boolean
  onFlip: () => void
  onKnown: () => void
  onUnknown: () => void
}

// Gleiche Flip-Optik wie StudyCard.tsx (dieselben CSS-Klassen), aber
// eigener Kartentyp: Vorderseite zeigt nur den Glyphen in einer
// gewürfelten Position, Rückseite verrät Name + Lautschrift + welche
// Position das war.
export function LetterStudyCard({ letter, position, flipped, onFlip, onKnown, onUnknown }: LetterStudyCardProps) {
  return (
    <div>
      <div
        className={`farsi-study-card ${flipped ? '' : 'is-clickable'}`.trim()}
        onClick={flipped ? undefined : onFlip}
      >
        <div className={`farsi-study-card__inner ${flipped ? 'is-flipped' : ''}`.trim()}>
          <div className="farsi-study-card__face farsi-study-card__face--front">
            <span className="farsi-study-card__script farsi-letter-card__glyph" dir="rtl">
              {glyphForPosition(letter, position)}
            </span>
          </div>
          <div className="farsi-study-card__face farsi-study-card__face--back">
            <span className="farsi-study-card__german">{letter.name}</span>
            <span className="farsi-study-card__latin">{letter.sound}</span>
            <span className="farsi-letter-card__position">Position: {POSITION_LABELS[position]}</span>
          </div>
        </div>
      </div>

      {!flipped ? (
        <Button variant="secondary" className="farsi-study-flip-btn" onClick={onFlip}>
          Umdrehen
        </Button>
      ) : (
        <div className="farsi-study-actions">
          <Button variant="danger" className="farsi-study-actions__unknown" onClick={onUnknown}>
            Wusste ich nicht
          </Button>
          <Button variant="primary" className="farsi-study-actions__known" onClick={onKnown}>
            Wusste ich
          </Button>
        </div>
      )}
    </div>
  )
}
