import { useEffect, useState, FormEvent } from 'react'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { trainingsplanService } from '@services/trainingsplan.service'
import type { Equipment } from '@app-types/trainingsplan'

interface EquipmentModalProps {
  onClose: () => void
  onChanged: () => void
}

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
  return message ?? 'Das hat leider nicht geklappt.'
}

export function EquipmentModal({ onClose, onChanged }: EquipmentModalProps) {
  const [items, setItems] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = () => trainingsplanService.listEquipment().then(({ data }) => setItems(data.equipment))

  useEffect(() => {
    load().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    try {
      await action()
      await load()
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const visibleItems = items.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()))

  const handleSaveEdit = (event: FormEvent, id: string) => {
    event.preventDefault()
    run(async () => {
      await trainingsplanService.updateEquipment(id, { name: editName.trim() })
      setEditingId(null)
    })
  }

  const handleDelete = (item: Equipment) => {
    if (!window.confirm(`"${item.name}" wirklich löschen?`)) return
    run(() => trainingsplanService.deleteEquipment(item.id))
  }

  const handleAdd = (event: FormEvent) => {
    event.preventDefault()
    run(async () => {
      await trainingsplanService.createEquipment({ name: newName.trim() })
      setNewName('')
    })
  }

  return (
    <div className="farsi-modal-backdrop" onClick={onClose}>
      <div
        className="farsi-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Trainingsgeräte"
      >
        <span className="farsi-modal__handle" aria-hidden="true" />

        <div className="trainingsplan-modal-body">
          <div className="trainingsplan-modal-header">
            <h3>Trainingsgeräte</h3>
            <button type="button" className="trainingsplan-modal-close" onClick={onClose} aria-label="Schließen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && <p className="form-error">{error}</p>}

          <Input placeholder="Gerät suchen…" value={search} onChange={(event) => setSearch(event.target.value)} />

          {loading ? (
            <p>Lädt…</p>
          ) : visibleItems.length === 0 ? (
            <p className="admin-empty-state">Kein Gerät gefunden.</p>
          ) : (
            <ul className="trainingsplan-area-list">
              {visibleItems.map((item) =>
                editingId === item.id ? (
                  <li key={item.id} className="trainingsplan-area-row trainingsplan-area-row--editing">
                    <form className="trainingsplan-area-form" onSubmit={(event) => handleSaveEdit(event, item.id)}>
                      <Input placeholder="Name" value={editName} onChange={(event) => setEditName(event.target.value)} />
                      <div className="trainingsplan-area-form__actions">
                        <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                          Abbrechen
                        </Button>
                        <Button type="submit" disabled={!editName.trim()}>
                          Speichern
                        </Button>
                      </div>
                    </form>
                  </li>
                ) : (
                  <li key={item.id} className="trainingsplan-area-row">
                    <span className="trainingsplan-area-row__body">
                      <span className="trainingsplan-area-row__name">{item.name}</span>
                      <span className="trainingsplan-area-row__meta">
                        {item.usageCount} Übung{item.usageCount === 1 ? '' : 'en'}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="trainingsplan-session-flow__icon-btn"
                      title="Bearbeiten"
                      aria-label={`${item.name} bearbeiten`}
                      onClick={() => {
                        setError(null)
                        setEditingId(item.id)
                        setEditName(item.name)
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="trainingsplan-session-flow__icon-btn"
                      title={item.usageCount > 0 ? 'Wird noch in Übungen verwendet' : 'Löschen'}
                      aria-label={`${item.name} löschen`}
                      disabled={item.usageCount > 0}
                      onClick={() => handleDelete(item)}
                    >
                      ×
                    </button>
                  </li>
                ),
              )}
            </ul>
          )}

          <form className="trainingsplan-area-add" onSubmit={handleAdd}>
            <span className="form-label">Neues Gerät</span>
            <Input
              placeholder="Name, z.B. Rückengerät"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
            <Button type="submit" disabled={!newName.trim()}>
              + Gerät hinzufügen
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
