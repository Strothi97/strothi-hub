import { useEffect, useMemo, useState } from 'react'
import { erinnerungenService } from '@services/erinnerungen.service'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { ReminderModal } from './ReminderModal'
import { describeRecurrence, RECURRENCE_ORDER } from './recurrence'
import type { Reminder, ReminderInput } from '@app-types/erinnerungen'

type SortMode = 'next' | 'frequency'

const SORT_LABELS: Record<SortMode, string> = {
  next: 'Nächstes Datum',
  frequency: 'Häufigkeit',
}
const SORT_ORDER: SortMode[] = ['next', 'frequency']

export function Erinnerungen() {
  const [allReminders, setAllReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [sortMode, setSortMode] = useState<SortMode>('next')
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [editing, setEditing] = useState<Reminder | null>(null)
  const [creating, setCreating] = useState(false)

  // ToDos werden in einem eigenen Tab (ToDos.tsx) verwaltet, teilen sich
  // aber dieselbe Reminder-Tabelle/denselben Endpunkt — hier ausfiltern.
  const reminders = useMemo(() => allReminders.filter((r) => !r.isTodo), [allReminders])

  const load = () =>
    erinnerungenService
      .listReminders()
      .then(({ data }) => setAllReminders(data.reminders))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const handleSave = async (input: ReminderInput) => {
    if (editing) {
      await erinnerungenService.updateReminder(editing.id, input)
    } else {
      await erinnerungenService.createReminder(input)
    }
    setEditing(null)
    setCreating(false)
    await load()
  }

  const handleDelete = async () => {
    if (!editing) return
    await erinnerungenService.deleteReminder(editing.id)
    setEditing(null)
    await load()
  }

  const toggleActive = async (reminder: Reminder) => {
    await erinnerungenService.updateReminder(reminder.id, { active: !reminder.active })
    await load()
  }

  // "Nächstes Datum": nach nextOccurrence, ohne weitere Fälligkeit (endDate
  // in der Vergangenheit) ans Ende. "Häufigkeit": nach Wiederholungsart
  // gruppiert (RECURRENCE_ORDER), innerhalb der Gruppe wieder nach Fälligkeit.
  const sortedReminders = useMemo(() => {
    return [...reminders].sort((a, b) => {
      if (sortMode === 'frequency') {
        const typeDiff = RECURRENCE_ORDER.indexOf(a.recurrence) - RECURRENCE_ORDER.indexOf(b.recurrence)
        if (typeDiff !== 0) return typeDiff
      }
      if (!a.nextOccurrence && !b.nextOccurrence) return 0
      if (!a.nextOccurrence) return 1
      if (!b.nextOccurrence) return -1
      return a.nextOccurrence.localeCompare(b.nextOccurrence)
    })
  }, [reminders, sortMode])

  return (
    <div>
      <div className="farsi-toolbar">
        <p className="erinnerungen-count">{reminders.length} Erinnerungen</p>
        <Button onClick={() => setCreating(true)}>+ Neue Erinnerung</Button>
      </div>

      {reminders.length > 0 && (
        <div className="farsi-sort-toggle" role="group" aria-label="Sortierung">
          <span className="farsi-sort-toggle__label farsi-sort-toggle__label--desktop">Sortieren:</span>
          <div className="farsi-filters__chips farsi-filters__chips--desktop">
            {SORT_ORDER.map((mode) => (
              <button
                key={mode}
                type="button"
                className={`tool-chip ${sortMode === mode ? 'is-active' : ''}`.trim()}
                onClick={() => setSortMode(mode)}
              >
                {SORT_LABELS[mode]}
              </button>
            ))}
          </div>
          <button type="button" className="farsi-filters__trigger" onClick={() => setSortPickerOpen(true)}>
            Sortieren: {SORT_LABELS[sortMode]} ▾
          </button>
        </div>
      )}

      {loading ? (
        <p>Lädt…</p>
      ) : reminders.length === 0 ? (
        <p className="admin-empty-state">Noch keine Erinnerungen angelegt.</p>
      ) : (
        <div className="farsi-entry-list">
          {sortedReminders.map((reminder) => (
            <Card
              key={reminder.id}
              className={`erinnerungen-reminder-card ${!reminder.active ? 'erinnerungen-reminder-card--paused' : ''}`.trim()}
              onClick={() => setEditing(reminder)}
            >
              <div className="erinnerungen-reminder-card__main">
                <span className="erinnerungen-reminder-card__title">{reminder.title}</span>
                <span className="erinnerungen-reminder-card__meta">
                  {describeRecurrence(reminder)} · {reminder.times.join(', ')} Uhr
                </span>
                {reminder.note && <p className="farsi-entry-card__note">{reminder.note}</p>}
              </div>
              <button
                type="button"
                className="erinnerungen-reminder-card__toggle"
                onClick={(event) => {
                  event.stopPropagation()
                  toggleActive(reminder)
                }}
              >
                {reminder.active ? 'Pausieren' : 'Aktivieren'}
              </button>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ReminderModal
          reminder={editing}
          isTodo={false}
          onSave={handleSave}
          onDelete={editing ? handleDelete : undefined}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
        />
      )}

      {sortPickerOpen && (
        <div className="farsi-modal-backdrop" onClick={() => setSortPickerOpen(false)}>
          <div
            className="farsi-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Sortierung wählen"
          >
            <span className="farsi-modal__handle" aria-hidden="true" />
            <div className="farsi-filters__list-header">
              <span className="farsi-filters__list-title">Sortieren</span>
            </div>
            <div className="farsi-filters__list-body">
              {SORT_ORDER.map((mode) => (
                <label key={mode} className="farsi-filters__list-item">
                  <input
                    type="radio"
                    name="erinnerungen-sort-mode"
                    checked={sortMode === mode}
                    onChange={() => {
                      setSortMode(mode)
                      setSortPickerOpen(false)
                    }}
                  />
                  <span>{SORT_LABELS[mode]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
