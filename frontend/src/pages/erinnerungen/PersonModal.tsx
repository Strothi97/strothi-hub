import { useEffect } from 'react'
import { PersonForm } from './PersonForm'
import type { Person, PersonInput } from '@app-types/erinnerungen'

interface PersonModalProps {
  person: Person | null
  onSave: (input: PersonInput) => Promise<Person>
  onSaved: () => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

export function PersonModal({ person, onSave, onSaved, onDelete, onClose }: PersonModalProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="farsi-modal-backdrop" onClick={onClose}>
      <div
        className="farsi-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={person ? 'Person bearbeiten' : 'Neue Person'}
      >
        <span className="farsi-modal__handle" aria-hidden="true" />
        <h3>{person ? 'Person bearbeiten' : 'Neue Person'}</h3>
        <div className="farsi-modal__form">
          <PersonForm person={person} onSave={onSave} onSaved={onSaved} onDelete={onDelete} onCancel={onClose} />
        </div>
      </div>
    </div>
  )
}
