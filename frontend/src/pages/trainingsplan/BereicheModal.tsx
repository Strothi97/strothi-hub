import { useEffect, useState, FormEvent } from 'react'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { trainingsplanService } from '@services/trainingsplan.service'
import type { FocusArea } from '@app-types/trainingsplan'

// Zum Antippen am Handy — freies Eingabefeld bleibt für alles andere.
const ICON_SUGGESTIONS = ['💪', '🔙', '🦵', '🏋️', '🔥', '🤸', '🏃', '🧘', '🚴', '🏊', '🎯', '⚡']

interface BereicheModalProps {
  onClose: () => void
  onChanged: () => void
}

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
  return message ?? 'Das hat leider nicht geklappt.'
}

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <div className="trainingsplan-icon-picker">
      <Input
        placeholder="Icon"
        value={value}
        maxLength={8}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="trainingsplan-icon-picker__suggestions">
        {ICON_SUGGESTIONS.map((icon) => (
          <button
            key={icon}
            type="button"
            className={`trainingsplan-icon-picker__option ${value === icon ? 'is-active' : ''}`.trim()}
            onClick={() => onChange(icon)}
            aria-label={`Icon ${icon}`}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  )
}

export function BereicheModal({ onClose, onChanged }: BereicheModalProps) {
  const [areas, setAreas] = useState<FocusArea[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState(ICON_SUGGESTIONS[0])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = () => trainingsplanService.listFocusAreas().then(({ data }) => setAreas(data.focusAreas))

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

  const visibleAreas = areas.filter((area) => area.name.toLowerCase().includes(search.trim().toLowerCase()))

  const startEdit = (area: FocusArea) => {
    setError(null)
    setEditingId(area.id)
    setEditName(area.name)
    setEditIcon(area.icon)
  }

  const handleSaveEdit = (event: FormEvent, id: string) => {
    event.preventDefault()
    run(async () => {
      await trainingsplanService.updateFocusArea(id, { name: editName.trim(), icon: editIcon.trim() })
      setEditingId(null)
    })
  }

  const handleDelete = (area: FocusArea) => {
    if (!window.confirm(`"${area.name}" wirklich löschen?`)) return
    run(() => trainingsplanService.deleteFocusArea(area.id))
  }

  const handleAdd = (event: FormEvent) => {
    event.preventDefault()
    run(async () => {
      await trainingsplanService.createFocusArea({ name: newName.trim(), icon: newIcon.trim() })
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
        aria-label="Trainingsbereiche"
      >
        <span className="farsi-modal__handle" aria-hidden="true" />

        <div className="trainingsplan-modal-body">
          <div className="trainingsplan-modal-header">
            <h3>Trainingsbereiche</h3>
            <button type="button" className="trainingsplan-modal-close" onClick={onClose} aria-label="Schließen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && <p className="form-error">{error}</p>}

          <Input placeholder="Bereich suchen…" value={search} onChange={(event) => setSearch(event.target.value)} />

          {loading ? (
            <p>Lädt…</p>
          ) : visibleAreas.length === 0 ? (
            <p className="admin-empty-state">Kein Bereich gefunden.</p>
          ) : (
            <ul className="trainingsplan-area-list">
              {visibleAreas.map((area) =>
                editingId === area.id ? (
                  <li key={area.id} className="trainingsplan-area-row trainingsplan-area-row--editing">
                    <form className="trainingsplan-area-form" onSubmit={(event) => handleSaveEdit(event, area.id)}>
                      <IconPicker value={editIcon} onChange={setEditIcon} />
                      <Input
                        placeholder="Name"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                      />
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
                  <li key={area.id} className="trainingsplan-area-row">
                    <span className="trainingsplan-area-row__icon" aria-hidden="true">
                      {area.icon}
                    </span>
                    <span className="trainingsplan-area-row__body">
                      <span className="trainingsplan-area-row__name">{area.name}</span>
                      <span className="trainingsplan-area-row__meta">
                        {area.usageCount} Übung{area.usageCount === 1 ? '' : 'en'}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="trainingsplan-session-flow__icon-btn"
                      title="Bearbeiten"
                      aria-label={`${area.name} bearbeiten`}
                      onClick={() => startEdit(area)}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="trainingsplan-session-flow__icon-btn"
                      title={area.usageCount > 0 ? 'Wird noch in Übungen verwendet' : 'Löschen'}
                      aria-label={`${area.name} löschen`}
                      disabled={area.usageCount > 0}
                      onClick={() => handleDelete(area)}
                    >
                      ×
                    </button>
                  </li>
                ),
              )}
            </ul>
          )}

          <form className="trainingsplan-area-add" onSubmit={handleAdd}>
            <span className="form-label">Neuer Bereich</span>
            <IconPicker value={newIcon} onChange={setNewIcon} />
            <Input
              id="bereich-neu-name"
              placeholder="Name, z.B. Unterarme"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
            <Button type="submit" disabled={!newName.trim()}>
              + Bereich hinzufügen
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
