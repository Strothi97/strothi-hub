import { useEffect } from 'react'
import { FarsiEntryForm } from './FarsiEntryForm'
import type { FarsiEntry, FarsiEntryInput } from '@app-types/farsi'

interface FarsiEntryModalProps {
  entry: FarsiEntry | null // null = neuer Begriff
  onSave: (input: Partial<FarsiEntryInput>) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

// Gleiches Bottom-Sheet/Dialog-Muster wie im Arbeitsnachweis-Tool (siehe
// DayStatusModal.tsx): auf dem Handy von unten, auf Desktop zentriert.
// Die eigentlichen Formularfelder stecken in FarsiEntryForm, das auch
// eingebettet in der Arbeitsfläche (ohne Modal-Chrome) verwendet wird.
export function FarsiEntryModal({ entry, onSave, onDelete, onClose }: FarsiEntryModalProps) {
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
        aria-label={entry ? 'Begriff bearbeiten' : 'Neuer Begriff'}
      >
        <span className="farsi-modal__handle" aria-hidden="true" />
        <h3>{entry ? 'Begriff bearbeiten' : 'Neuer Begriff'}</h3>
        <div className="farsi-modal__form">
          <FarsiEntryForm entry={entry} onSave={onSave} onDelete={onDelete} onCancel={onClose} />
        </div>
      </div>
    </div>
  )
}
