import { useEffect, useMemo, useState } from 'react'
import { erinnerungenService } from '@services/erinnerungen.service'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { ReminderModal } from './ReminderModal'
import { describeRecurrence } from './recurrence'
import type { Reminder, ReminderInput } from '@app-types/erinnerungen'

export function ToDos() {
  const [allReminders, setAllReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const [editing, setEditing] = useState<Reminder | null>(null)
  const [creating, setCreating] = useState(false)

  const todos = useMemo(() => allReminders.filter((r) => r.isTodo), [allReminders])

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

  const toggleCompleted = async (todo: Reminder) => {
    await erinnerungenService.updateReminder(todo.id, { completed: !todo.completed })
    await load()
  }

  // Offene ToDos zuerst (fällig laut nextOccurrence, sonst Startdatum als
  // Fallback — sonst würde ein überfälliges einmaliges ToDo wie ein
  // erledigtes ans Ende rutschen), erledigte danach nach letzter Änderung.
  const sortedOpen = useMemo(() => {
    return todos
      .filter((t) => !t.completed)
      .sort((a, b) => (a.nextOccurrence ?? a.startDate).localeCompare(b.nextOccurrence ?? b.startDate))
  }, [todos])

  const sortedDone = useMemo(() => {
    return todos.filter((t) => t.completed).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [todos])

  const visibleDone = showDone ? sortedDone : []

  return (
    <div>
      <div className="farsi-toolbar">
        <p className="erinnerungen-count">{sortedOpen.length} offene ToDos</p>
        <Button onClick={() => setCreating(true)}>+ Neues ToDo</Button>
      </div>

      {sortedDone.length > 0 && (
        <button type="button" className="erinnerungen-todo-show-done" onClick={() => setShowDone((v) => !v)}>
          {showDone ? 'Erledigte ausblenden' : `Erledigte anzeigen (${sortedDone.length})`}
        </button>
      )}

      {loading ? (
        <p>Lädt…</p>
      ) : todos.length === 0 ? (
        <p className="admin-empty-state">Noch keine ToDos angelegt.</p>
      ) : (
        <div className="farsi-entry-list">
          {[...sortedOpen, ...visibleDone].map((todo) => (
            <Card
              key={todo.id}
              className={`erinnerungen-todo-card ${todo.completed ? 'erinnerungen-todo-card--done' : ''}`.trim()}
              onClick={() => setEditing(todo)}
            >
              <button
                type="button"
                className={`erinnerungen-todo-card__check ${todo.completed ? 'is-done' : ''}`.trim()}
                onClick={(event) => {
                  event.stopPropagation()
                  toggleCompleted(todo)
                }}
                aria-label={todo.completed ? 'Als offen markieren' : 'Als erledigt markieren'}
              >
                {todo.completed ? '✓' : ''}
              </button>
              <div className="erinnerungen-todo-card__main">
                <span
                  className={`erinnerungen-todo-card__title ${
                    todo.completed ? 'erinnerungen-todo-card__title--done' : ''
                  }`.trim()}
                >
                  {todo.title}
                </span>
                <span className="erinnerungen-todo-card__meta">
                  {describeRecurrence(todo)} · {todo.times.join(', ')} Uhr
                </span>
                {todo.note && <p className="farsi-entry-card__note">{todo.note}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ReminderModal
          reminder={editing}
          isTodo={true}
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
