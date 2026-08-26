import { useState, FormEvent } from 'react'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { TimesInput } from './TimesInput'
import { NumberStepper } from './NumberStepper'
import {
  RECURRENCE_LABELS,
  RECURRENCE_ORDER,
  INTERVAL_UNIT_LABELS,
  INTERVAL_UNIT_ORDER,
  WEEKDAY_LABELS,
} from './recurrence'
import type { IntervalUnit, Reminder, ReminderInput, ReminderRecurrence } from '@app-types/erinnerungen'

interface ReminderFormProps {
  reminder: Reminder | null // null = neue Erinnerung/neues ToDo
  isTodo: boolean
  onSave: (input: ReminderInput) => Promise<void>
  onDelete?: () => Promise<void>
  onCancel: () => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ReminderForm({ reminder, isTodo, onSave, onDelete, onCancel }: ReminderFormProps) {
  const [title, setTitle] = useState(reminder?.title ?? '')
  const [note, setNote] = useState(reminder?.note ?? '')
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>(reminder?.recurrence ?? 'ONCE')
  const [startDate, setStartDate] = useState(reminder?.startDate ?? today())
  const [endDate, setEndDate] = useState(reminder?.endDate ?? '')
  const [intervalN, setIntervalN] = useState(reminder?.intervalN ?? 1)
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>(reminder?.intervalUnit ?? 'MONTH')
  const [weekdays, setWeekdays] = useState<number[]>(reminder?.weekdays ?? [])
  const [times, setTimes] = useState<string[]>(reminder?.times ?? ['09:00'])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const toggleWeekday = (day: number) => {
    setWeekdays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError('Bitte einen Titel angeben.')
      return
    }
    if (times.length === 0) {
      setError('Bitte mindestens eine Uhrzeit angeben.')
      return
    }
    if (recurrence === 'WEEKDAYS' && weekdays.length === 0) {
      setError('Bitte mindestens einen Wochentag wählen.')
      return
    }
    if (recurrence === 'CUSTOM_INTERVAL' && (!intervalN || intervalN < 1)) {
      setError('Bitte ein gültiges Intervall angeben.')
      return
    }
    if (endDate && endDate < startDate) {
      setError('Das Enddatum darf nicht vor dem Startdatum liegen.')
      return
    }

    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        note: note.trim() || null,
        recurrence,
        startDate,
        endDate: recurrence === 'ONCE' ? null : endDate || null,
        intervalN: recurrence === 'CUSTOM_INTERVAL' ? intervalN : null,
        intervalUnit: recurrence === 'CUSTOM_INTERVAL' ? intervalUnit : null,
        weekdays: recurrence === 'WEEKDAYS' ? weekdays : null,
        times,
        isTodo,
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
    <form onSubmit={handleSubmit} className="erinnerungen-form">
      <Input
        id="reminder-title"
        label="Titel"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="z.B. Oma fragen, warum sie die App installiert hat"
      />

      <div className="form-group">
        <label className="form-label" htmlFor="reminder-note">
          Notiz (optional)
        </label>
        <textarea
          id="reminder-note"
          className="input"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <div className="form-group">
        <span className="form-label">Wiederholung</span>
        <div className="farsi-filters">
          {RECURRENCE_ORDER.map((option) => (
            <button
              key={option}
              type="button"
              className={`tool-chip ${recurrence === option ? 'is-active' : ''}`.trim()}
              onClick={() => setRecurrence(option)}
            >
              {RECURRENCE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <div className={recurrence === 'ONCE' ? undefined : 'erinnerungen-date-row'}>
        <Input
          id="reminder-start"
          type="date"
          label={recurrence === 'ONCE' ? 'Datum' : 'Start ab'}
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
        {recurrence !== 'ONCE' && (
          <Input
            id="reminder-end"
            type="date"
            label="Bis (optional)"
            value={endDate}
            min={startDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        )}
      </div>

      {recurrence === 'CUSTOM_INTERVAL' && (
        <div className="form-group">
          <span className="form-label">Alle …</span>
          <div className="erinnerungen-interval-row">
            <NumberStepper value={intervalN} onChange={setIntervalN} />
            {INTERVAL_UNIT_ORDER.map((unit) => (
              <button
                key={unit}
                type="button"
                className={`tool-chip ${intervalUnit === unit ? 'is-active' : ''}`.trim()}
                onClick={() => setIntervalUnit(unit)}
              >
                {INTERVAL_UNIT_LABELS[unit]}
              </button>
            ))}
          </div>
        </div>
      )}

      {recurrence === 'WEEKDAYS' && (
        <div className="form-group">
          <span className="form-label">Wochentage</span>
          <div className="farsi-filters">
            {WEEKDAY_LABELS.map((label, day) => (
              <button
                key={day}
                type="button"
                className={`tool-chip ${weekdays.includes(day) ? 'is-active' : ''}`.trim()}
                onClick={() => toggleWeekday(day)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="form-group">
        <span className="form-label">Uhrzeiten</span>
        <TimesInput value={times} onChange={setTimes} />
      </div>

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
