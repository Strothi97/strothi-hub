import { useEffect } from 'react'
import { STATUS_META, STATUS_ORDER, chipStyle } from './status'
import type { WorkDayStatus } from '@app-types/homeoffice'

interface DayStatusModalProps {
  date: string
  currentStatus: WorkDayStatus | null
  onSelect: (status: WorkDayStatus | null) => void
  onClose: () => void
}

function formatFullDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Zentrales Overlay statt eines an der Kachel verankerten Popovers — auf dem
// Handy als Bottom-Sheet (volle Breite, große Tap-Flächen), auf Desktop als
// zentriertes Dialogfenster (per CSS media query, siehe homeoffice.css).
export function DayStatusModal({ date, currentStatus, onSelect, onClose }: DayStatusModalProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="day-status-modal-backdrop" onClick={onClose}>
      <div
        className="day-status-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Status für ${formatFullDate(date)}`}
      >
        <span className="day-status-modal__handle" aria-hidden="true" />
        <h3>{formatFullDate(date)}</h3>
        <div className="day-status-modal__options">
          {STATUS_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              className={`day-status-chip day-status-chip--block ${
                currentStatus === status ? 'is-active' : ''
              }`.trim()}
              style={chipStyle(status)}
              onClick={() => onSelect(status)}
            >
              <span>{STATUS_META[status].icon}</span> {STATUS_META[status].label}
            </button>
          ))}
          {currentStatus && (
            <button
              type="button"
              className="day-status-chip day-status-chip--block"
              onClick={() => onSelect(null)}
            >
              Zurücksetzen
            </button>
          )}
        </div>
        <button type="button" className="day-status-modal__cancel" onClick={onClose}>
          Abbrechen
        </button>
      </div>
    </div>
  )
}
