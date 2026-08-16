import { useEffect, useState, FormEvent } from 'react'
import { Button } from '@components/ui/Button'
import { TagInput } from './TagInput'
import { WORD_TYPE_META, WORD_TYPE_ORDER } from './wordType'
import type { FarsiEntry, FarsiEntryInput, FarsiWordType } from '@app-types/farsi'

interface FarsiEntryModalProps {
  entry: FarsiEntry | null // null = neuer Begriff
  onSave: (input: Partial<FarsiEntryInput>) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

// Gleiches Bottom-Sheet/Dialog-Muster wie im Arbeitsnachweis-Tool (siehe
// DayStatusModal.tsx): auf dem Handy von unten, auf Desktop zentriert.
export function FarsiEntryModal({ entry, onSave, onDelete, onClose }: FarsiEntryModalProps) {
  const [german, setGerman] = useState<string[]>(entry?.german ?? [])
  const [persianLatin, setPersianLatin] = useState<string[]>(entry?.persianLatin ?? [])
  const [persianScript, setPersianScript] = useState(entry?.persianScript ?? '')
  const [type, setType] = useState<FarsiWordType | null>(entry?.type ?? null)
  const [meaning, setMeaning] = useState(entry?.meaning ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (german.length === 0 && persianLatin.length === 0) {
      setError('Bitte mindestens Deutsch oder Lautschrift angeben.')
      return
    }
    setSaving(true)
    try {
      await onSave({
        german,
        persianLatin,
        persianScript: persianScript.trim() || null,
        type,
        meaning: meaning.trim() || null,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="farsi-modal-backdrop" onClick={onClose}>
      <div
        className="farsi-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={entry ? 'Begriff bearbeiten' : 'Neuer Begriff'}
      >
        <span className="farsi-modal__handle" aria-hidden="true" />
        <h3>{entry ? 'Begriff bearbeiten' : 'Neuer Begriff'}</h3>
        <form onSubmit={handleSubmit} className="farsi-modal__form">
          <div className="form-group">
            <span className="form-label">Deutsch</span>
            <TagInput value={german} onChange={setGerman} placeholder="Wort eintippen, Enter zum Hinzufügen" />
          </div>
          <div className="form-group">
            <span className="form-label">Lautschrift</span>
            <TagInput value={persianLatin} onChange={setPersianLatin} placeholder="z.B. xāne" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="farsi-script">
              Persische Schrift
            </label>
            <input
              id="farsi-script"
              className="input farsi-script-input"
              dir="rtl"
              value={persianScript}
              onChange={(event) => setPersianScript(event.target.value)}
              placeholder="خانه"
            />
          </div>
          <div className="form-group">
            <span className="form-label">Kategorie</span>
            <div className="farsi-type-chips">
              {WORD_TYPE_ORDER.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`tool-chip ${type === option ? 'is-active' : ''}`.trim()}
                  onClick={() => setType(type === option ? null : option)}
                >
                  <span>{WORD_TYPE_META[option].icon}</span> {WORD_TYPE_META[option].label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="farsi-meaning">
              Bedeutung / Notiz (optional)
            </label>
            <textarea
              id="farsi-meaning"
              className="input farsi-meaning-input"
              value={meaning}
              onChange={(event) => setMeaning(event.target.value)}
              rows={2}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="farsi-modal__actions">
            {onDelete && (
              <button type="button" className="farsi-modal__delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Löscht…' : 'Löschen'}
              </button>
            )}
            <div className="farsi-modal__actions-right">
              <Button type="button" variant="secondary" onClick={onClose}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Speichern…' : 'Speichern'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
