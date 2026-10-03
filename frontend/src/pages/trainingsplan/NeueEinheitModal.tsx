import { useState, FormEvent } from 'react'
import { Button } from '@components/ui/Button'
import { trainingsplanService } from '@services/trainingsplan.service'
import { toDatetimeLocalValue } from './format'
import type { TrainingSession } from '@app-types/trainingsplan'

interface NeueEinheitModalProps {
  onClose: () => void
  onCreated: (session: TrainingSession) => void
}

// Feature 4: Datum + Uhrzeit, eigenständige Eingabe möglich, sonst "jetzt"
// (Default beim Öffnen). Ein einzelnes datetime-local-Feld statt getrennter
// Datum-/Uhrzeit-Strings, die man selbst zusammensetzt — new Date("YYYY-MM-DD")
// allein parst sonst als UTC-Mitternacht, ein voller "YYYY-MM-DDTHH:mm"-Wert
// dagegen korrekt als lokale Zeit.
export function NeueEinheitModal({ onClose, onCreated }: NeueEinheitModalProps) {
  const [performedAt, setPerformedAt] = useState(() => toDatetimeLocalValue(new Date()))
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const date = new Date(performedAt)
    if (Number.isNaN(date.getTime())) {
      setError('Bitte ein gültiges Datum/Uhrzeit angeben.')
      return
    }
    setSaving(true)
    try {
      const { data } = await trainingsplanService.createSession({
        performedAt: date.toISOString(),
        note: note.trim() || null,
      })
      onCreated(data.session)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="farsi-modal-backdrop" onClick={onClose}>
      <div
        className="farsi-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Neue Trainingseinheit"
      >
        <span className="farsi-modal__handle" aria-hidden="true" />
        <h3>Neue Trainingseinheit</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="einheit-performed-at">
              Datum + Uhrzeit
            </label>
            <input
              id="einheit-performed-at"
              type="datetime-local"
              className="input"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="einheit-note">
              Notiz (optional)
            </label>
            <input
              id="einheit-note"
              type="text"
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="farsi-modal__actions">
            <div className="farsi-modal__actions-right" style={{ width: '100%' }}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Starten…' : 'Starten'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
