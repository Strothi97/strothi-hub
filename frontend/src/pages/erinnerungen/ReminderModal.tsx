import { useEffect } from 'react'
import { ReminderForm } from './ReminderForm'
import type { Reminder, ReminderInput } from '@app-types/erinnerungen'

interface ReminderModalProps {
  reminder: Reminder | null
  isTodo: boolean
  onSave: (input: ReminderInput) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

// Gleiches Bottom-Sheet/Dialog-Muster wie im Farsi-Tool (FarsiEntryModal.tsx).
export function ReminderModal({ reminder, isTodo, onSave, onDelete, onClose }: ReminderModalProps) {
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
        aria-label={reminder ? (isTodo ? 'ToDo bearbeiten' : 'Erinnerung bearbeiten') : isTodo ? 'Neues ToDo' : 'Neue Erinnerung'}
      >
        <span className="farsi-modal__handle" aria-hidden="true" />
        <h3>{reminder ? (isTodo ? 'ToDo bearbeiten' : 'Erinnerung bearbeiten') : isTodo ? 'Neues ToDo' : 'Neue Erinnerung'}</h3>
        <div className="farsi-modal__form">
          <ReminderForm reminder={reminder} isTodo={isTodo} onSave={onSave} onDelete={onDelete} onCancel={onClose} />
        </div>
      </div>
    </div>
  )
}
