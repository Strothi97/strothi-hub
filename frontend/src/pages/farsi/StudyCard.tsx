import { Button } from '@components/ui/Button'
import type { FarsiEntry } from '@app-types/farsi'
import type { FaceSide } from './studySession'

function renderFace(entry: FarsiEntry, side: FaceSide) {
  switch (side) {
    case 'german':
      return <span className="farsi-study-card__german">{entry.german.join(' / ') || '—'}</span>
    case 'farsi-latin':
      return <span className="farsi-study-card__latin">{entry.persianLatin.join(' / ') || '—'}</span>
    case 'farsi-script':
      return (
        <span className="farsi-study-card__script" dir="rtl">
          {entry.persianScript ?? '—'}
        </span>
      )
    case 'farsi-both':
      return (
        <>
          {entry.persianScript && (
            <span className="farsi-study-card__script" dir="rtl">
              {entry.persianScript}
            </span>
          )}
          <span className="farsi-study-card__latin">{entry.persianLatin.join(' / ') || '—'}</span>
        </>
      )
  }
}

interface StudyCardProps {
  entry: FarsiEntry
  front: FaceSide
  back: FaceSide
  flipped: boolean
  onFlip: () => void
  onKnown: () => void
  onUnknown: () => void
}

export function StudyCard({ entry, front, back, flipped, onFlip, onKnown, onUnknown }: StudyCardProps) {
  return (
    <div>
      <div
        className={`farsi-study-card ${flipped ? '' : 'is-clickable'}`.trim()}
        onClick={flipped ? undefined : onFlip}
      >
        <div className={`farsi-study-card__inner ${flipped ? 'is-flipped' : ''}`.trim()}>
          <div className="farsi-study-card__face farsi-study-card__face--front">{renderFace(entry, front)}</div>
          <div className="farsi-study-card__face farsi-study-card__face--back">{renderFace(entry, back)}</div>
        </div>
      </div>

      {!flipped ? (
        <Button variant="secondary" className="farsi-study-flip-btn" onClick={onFlip}>
          Umdrehen
        </Button>
      ) : (
        <div className="farsi-study-actions">
          <Button
            variant="danger"
            className="farsi-study-actions__unknown"
            onClick={onUnknown}
          >
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
