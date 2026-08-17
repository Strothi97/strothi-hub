import { useEffect, useState } from 'react'
import { erinnerungenService } from '@services/erinnerungen.service'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { ReminderModal } from './ReminderModal'
import { describeRecurrence } from './recurrence'
import type { Reminder, ReminderInput } from '@app-types/erinnerungen'

export function Erinnerungen() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Reminder | null>(null)
  const [creating, setCreating] = useState(false)

  const load = () =>
    erinnerungenService
      .listReminders()
      .then(({ data }) => setReminders(data.reminders))
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

  return (
    <div>
      <div className="farsi-toolbar">
        <p className="erinnerungen-count">{reminders.length} Erinnerungen</p>
        <Button onClick={() => setCreating(true)}>+ Neue Erinnerung</Button>
      </div>

      {loading ? (
        <p>Lädt…</p>
      ) : reminders.length === 0 ? (
        <p className="admin-empty-state">Noch keine Erinnerungen angelegt.</p>
      ) : (
        <div className="farsi-entry-list">
          {reminders.map((reminder) => (
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
          onSave={handleSave}
          onDelete={editing ? handleDelete : undefined}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
