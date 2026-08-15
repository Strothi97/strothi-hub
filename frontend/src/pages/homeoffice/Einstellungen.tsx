import { useEffect, useState, FormEvent } from 'react'
import { homeofficeService } from '@services/homeoffice.service'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { BUNDESLAND_LABELS, BUNDESLAND_OPTIONS } from './bundesland'
import type { Bundesland, FederalStateEntry } from '@app-types/homeoffice'

export function Einstellungen() {
  const [states, setStates] = useState<FederalStateEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<Bundesland>('NW')
  const [validFrom, setValidFrom] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = () => homeofficeService.listStates().then(({ data }) => setStates(data.states))

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!validFrom) {
      setError('Bitte ein Datum angeben')
      return
    }
    try {
      await homeofficeService.addState({ state, validFrom })
      setValidFrom('')
      load()
    } catch {
      setError('Konnte nicht gespeichert werden')
    }
  }

  const handleDelete = async (id: string) => {
    await homeofficeService.deleteState(id)
    load()
  }

  if (loading) return <p>Lädt…</p>

  return (
    <div>
      <Card className="settings-form-card">
        <h2>Bundesland-Verlauf</h2>
        <p className="page-subtitle">
          Für die automatische Feiertagserkennung. Bei einem Umzug einfach einen neuen Eintrag „ab
          Datum X" hinzufügen — ältere Tage bleiben mit dem alten Bundesland korrekt.
        </p>
        <form onSubmit={handleAdd} className="settings-form">
          <div className="form-group">
            <label className="form-label" htmlFor="state-select">
              Bundesland
            </label>
            <select
              id="state-select"
              className="input"
              value={state}
              onChange={(event) => setState(event.target.value as Bundesland)}
            >
              {BUNDESLAND_OPTIONS.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Input
            id="valid-from"
            label="Gültig ab"
            type="date"
            value={validFrom}
            onChange={(event) => setValidFrom(event.target.value)}
          />
          {error && <p className="form-error">{error}</p>}
          <Button type="submit">Hinzufügen</Button>
        </form>
      </Card>

      <Card className="settings-list-card">
        <h2>Verlauf</h2>
        {states.length === 0 ? (
          <p className="admin-empty-state">Noch kein Bundesland hinterlegt.</p>
        ) : (
          <ul className="state-history-list">
            {states.map((entry) => (
              <li key={entry.id}>
                <span>
                  ab {entry.validFrom.split('-').reverse().join('.')}: {BUNDESLAND_LABELS[entry.state]}
                </span>
                <button type="button" onClick={() => handleDelete(entry.id)}>
                  Entfernen
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
