import { useState, FormEvent } from 'react'
import { Button } from '@components/ui/Button'
import { TagInput } from './TagInput'
import { WORD_TYPE_META, WORD_TYPE_ORDER } from './wordType'
import type { FarsiEntry, FarsiEntryInput, FarsiWordType } from '@app-types/farsi'

const EMPTY_STATE = { german: [] as string[], persianLatin: [] as string[], persianScript: '', type: null as FarsiWordType | null, meaning: '' }

interface FarsiEntryFormProps {
  entry: FarsiEntry | null // null = neuer Begriff
  onSave: (input: Partial<FarsiEntryInput>) => Promise<void>
  onDelete?: () => Promise<void>
  onCancel?: () => void
}

// Reine Formularfelder für einen Farsi-Eintrag — wird sowohl im
// Bearbeiten-Dialog (FarsiEntryModal) als auch direkt eingebettet in der
// Arbeitsfläche (Arbeitsflaeche.tsx, "Neuer Begriff"-Panel) verwendet.
export function FarsiEntryForm({ entry, onSave, onDelete, onCancel }: FarsiEntryFormProps) {
  const [german, setGerman] = useState<string[]>(entry?.german ?? EMPTY_STATE.german)
  const [persianLatin, setPersianLatin] = useState<string[]>(entry?.persianLatin ?? EMPTY_STATE.persianLatin)
  const [persianScript, setPersianScript] = useState(entry?.persianScript ?? EMPTY_STATE.persianScript)
  const [type, setType] = useState<FarsiWordType | null>(entry?.type ?? EMPTY_STATE.type)
  const [meaning, setMeaning] = useState(entry?.meaning ?? EMPTY_STATE.meaning)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
      // Beim Neuanlegen (kein bestehender Eintrag) das Formular für den
      // nächsten Begriff leeren, statt es offen mit alten Werten stehen
      // zu lassen — wichtig für den Schnell-Hinzufügen-Workflow.
      if (!entry) {
        setGerman(EMPTY_STATE.german)
        setPersianLatin(EMPTY_STATE.persianLatin)
        setPersianScript(EMPTY_STATE.persianScript)
        setType(EMPTY_STATE.type)
        setMeaning(EMPTY_STATE.meaning)
      }
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
    <form onSubmit={handleSubmit} className="farsi-entry-form">
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
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Abbrechen
            </Button>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
        </div>
      </div>
    </form>
  )
}
