import { useState } from 'react'
import { Button } from '@components/ui/Button'
import type { FarsiEntry } from '@app-types/farsi'
import type { FaceSide } from './studySession'
import { WORD_TYPE_META } from './wordType'

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
  onFlipBack: () => void
  onKnown: () => void
  onUnknown: () => void
}

export function StudyCard({ entry, front, back, flipped, onFlip, onFlipBack, onKnown, onUnknown }: StudyCardProps) {
  // Lokal statt gelifted: StudyCard wird pro Karte neu gemountet
  // (key={entry.id} im Elternteil), setzt sich also automatisch zurück.
  const [noteOpen, setNoteOpen] = useState(false)

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
        {entry.type && (
          <span className="farsi-study-card__type-badge" title={WORD_TYPE_META[entry.type].label}>
            {WORD_TYPE_META[entry.type].icon}
          </span>
        )}
        {flipped && (
          <button
            type="button"
            className="farsi-study-card__flip-back"
            onClick={(event) => {
              event.stopPropagation()
              onFlipBack()
            }}
            aria-label="Karte zurückdrehen"
            title="Zurückdrehen"
          >
            🔄
          </button>
        )}
      </div>

      {!flipped ? (
        <Button variant="secondary" className="farsi-study-flip-btn" onClick={onFlip}>
          Umdrehen
        </Button>
      ) : (
        <>
          {entry.meaning && (
            <div className="farsi-study-note">
              <button type="button" className="farsi-study-note__toggle" onClick={() => setNoteOpen((v) => !v)}>
                {noteOpen ? 'Hinweis ausblenden' : 'ℹ️ Hinweis anzeigen'}
              </button>
              {noteOpen && <p className="farsi-study-note__text">{entry.meaning}</p>}
            </div>
          )}
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
        </>
      )}
    </div>
  )
}
