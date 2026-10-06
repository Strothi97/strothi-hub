import { useEffect, useState, FormEvent } from 'react'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { haushaltsbuchService } from '@services/haushaltsbuch.service'
import type { Haendler } from '@app-types/haushaltsbuch'
import { formatEuro } from './format'

interface HaendlerModalProps {
  onClose: () => void
  onChanged: () => void
}

function errorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
  return message ?? 'Das hat leider nicht geklappt.'
}

export function HaendlerModal({ onClose, onChanged }: HaendlerModalProps) {
  const [haendler, setHaendler] = useState<Haendler[]>([])
  const [loading, setLoading] = useState(true)
  const [suche, setSuche] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [neu, setNeu] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)

  const load = () => haushaltsbuchService.listHaendler().then(({ data }) => setHaendler(data.haendler))

  useEffect(() => {
    load().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const run = async (action: () => Promise<unknown>) => {
    setFehler(null)
    try {
      await action()
      await load()
      onChanged()
    } catch (err) {
      setFehler(errorMessage(err))
    }
  }

  const sichtbar = haendler.filter((h) => h.name.toLowerCase().includes(suche.trim().toLowerCase()))

  const handleAdd = (event: FormEvent) => {
    event.preventDefault()
    run(async () => {
      await haushaltsbuchService.createHaendler(neu.trim())
      setNeu('')
    })
  }

  const handleSaveEdit = (event: FormEvent, id: string) => {
    event.preventDefault()
    run(async () => {
      await haushaltsbuchService.updateHaendler(id, editName.trim())
      setEditingId(null)
    })
  }

  const handleDelete = (h: Haendler) => {
    if (!window.confirm(`"${h.name}" wirklich löschen?`)) return
    run(() => haushaltsbuchService.deleteHaendler(h.id))
  }

  return (
    <div className="farsi-modal-backdrop" onClick={onClose}>
      <div
        className="farsi-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Händler verwalten"
      >
        <span className="farsi-modal__handle" aria-hidden="true" />
        <div className="trainingsplan-modal-body">
          <div className="trainingsplan-modal-header">
            <h3>Händler</h3>
            <button type="button" className="trainingsplan-modal-close" onClick={onClose} aria-label="Schließen">
              ×
            </button>
          </div>

          {fehler && <p className="form-error">{fehler}</p>}

          <Input placeholder="Händler suchen…" value={suche} onChange={(e) => setSuche(e.target.value)} />

          {loading ? (
            <p>Lädt…</p>
          ) : sichtbar.length === 0 ? (
            <p className="admin-empty-state">Noch kein Händler gespeichert.</p>
          ) : (
            <ul className="trainingsplan-area-list">
              {sichtbar.map((h) =>
                editingId === h.id ? (
                  <li key={h.id} className="trainingsplan-area-row trainingsplan-area-row--editing">
                    <form className="trainingsplan-area-form" onSubmit={(event) => handleSaveEdit(event, h.id)}>
                      <Input placeholder="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
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
                  <li key={h.id} className="trainingsplan-area-row">
                    <span className="trainingsplan-area-row__body">
                      <span className="trainingsplan-area-row__name">{h.name}</span>
                      <span className="trainingsplan-area-row__meta">
                        {h.usageCount} Buchung{h.usageCount === 1 ? '' : 'en'}
                        {h.ausgaben > 0 && (
                          <>
                            {' · '}
                            <span className="is-ausgabe-text">−{formatEuro(h.ausgaben)}</span>
                          </>
                        )}
                        {h.einnahmen > 0 && (
                          <>
                            {' · '}
                            <span className="is-einnahme-text">+{formatEuro(h.einnahmen)}</span>
                          </>
                        )}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="trainingsplan-session-flow__icon-btn"
                      title="Umbenennen"
                      aria-label={`${h.name} umbenennen`}
                      onClick={() => {
                        setFehler(null)
                        setEditingId(h.id)
                        setEditName(h.name)
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="trainingsplan-session-flow__icon-btn"
                      title={h.usageCount > 0 ? 'Wird noch in Buchungen verwendet' : 'Löschen'}
                      aria-label={`${h.name} löschen`}
                      disabled={h.usageCount > 0}
                      onClick={() => handleDelete(h)}
                    >
                      ×
                    </button>
                  </li>
                ),
              )}
            </ul>
          )}

          <form className="trainingsplan-area-add" onSubmit={handleAdd}>
            <span className="form-label">Neuer Händler</span>
            <Input placeholder="Name, z.B. Edeka" value={neu} onChange={(e) => setNeu(e.target.value)} />
            <Button type="submit" disabled={!neu.trim()}>
              + Händler hinzufügen
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
