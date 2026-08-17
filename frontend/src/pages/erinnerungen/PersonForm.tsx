import { useRef, useState, FormEvent, ChangeEvent } from 'react'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { erinnerungenService } from '@services/erinnerungen.service'
import type { Person, PersonInput } from '@app-types/erinnerungen'

interface PersonFormProps {
  person: Person | null // null = neue Person
  onSave: (input: PersonInput) => Promise<Person>
  onSaved: () => Promise<void>
  onDelete?: () => Promise<void>
  onCancel: () => void
}

export function PersonForm({ person, onSave, onSaved, onDelete, onCancel }: PersonFormProps) {
  const [firstName, setFirstName] = useState(person?.firstName ?? '')
  const [lastName, setLastName] = useState(person?.lastName ?? '')
  const [birthday, setBirthday] = useState(person?.birthday ?? '')
  const [congratsCheckEnabled, setCongratsCheckEnabled] = useState(person?.congratsCheckEnabled ?? true)
  const [photoPreview, setPhotoPreview] = useState<string | null>(person?.photoUrl ?? null)
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPendingPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!firstName.trim()) {
      setError('Bitte einen Vornamen angeben.')
      return
    }
    if (!birthday) {
      setError('Bitte ein Geburtsdatum angeben.')
      return
    }

    setSaving(true)
    try {
      const saved = await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        birthday,
        congratsCheckEnabled,
      })
      // Foto erst nach dem Speichern hochladen — bei einer neuen Person
      // existiert die ID vorher noch nicht. Liste erst danach neu laden
      // und Modal schließen, sonst zeigt die Liste kurz den alten Stand.
      if (pendingPhoto) {
        await erinnerungenService.uploadPersonPhoto(saved.id, pendingPhoto)
      }
      await onSaved()
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
    <form onSubmit={handleSubmit} className="erinnerungen-form">
      <div className="erinnerungen-photo-picker" onClick={() => fileInputRef.current?.click()}>
        {photoPreview ? (
          <img
            src={photoPreview}
            alt=""
            className="erinnerungen-photo-picker__preview"
            onError={() => setPhotoPreview(null)}
          />
        ) : (
          <span className="erinnerungen-photo-picker__placeholder">📷 Foto hinzufügen</span>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
      </div>
      <Input id="person-firstname" label="Vorname" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
      <Input id="person-lastname" label="Nachname (optional)" value={lastName} onChange={(event) => setLastName(event.target.value)} />
      <Input id="person-birthday" type="date" label="Geburtstag" value={birthday} onChange={(event) => setBirthday(event.target.value)} />

      <label className="erinnerungen-checkbox">
        <input
          type="checkbox"
          checked={congratsCheckEnabled}
          onChange={(event) => setCongratsCheckEnabled(event.target.checked)}
        />
        Um 20 Uhr fragen, ob ich gratuliert habe
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="farsi-modal__actions">
        {onDelete && (
          <button type="button" className="farsi-modal__delete" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Löscht…' : 'Löschen'}
          </button>
        )}
        <div className="farsi-modal__actions-right">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
        </div>
      </div>
    </form>
  )
}
