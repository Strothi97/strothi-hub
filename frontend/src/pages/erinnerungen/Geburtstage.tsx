import { useEffect, useMemo, useState, MouseEvent } from 'react'
import { erinnerungenService } from '@services/erinnerungen.service'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { PersonModal } from './PersonModal'
import type { Person, PersonInput } from '@app-types/erinnerungen'

type SortMode = 'firstName' | 'lastName' | 'upcoming'

const SORT_LABELS: Record<SortMode, string> = {
  firstName: 'Vorname',
  lastName: 'Nachname',
  upcoming: 'Nächster Geburtstag',
}
const SORT_ORDER: SortMode[] = ['firstName', 'lastName', 'upcoming']

function formatBirthday(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDaysUntil(days: number): string {
  if (days === 0) return 'heute! 🎉'
  if (days === 1) return 'morgen'
  return `in ${days} Tagen`
}

export function Geburtstage() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [sortMode, setSortMode] = useState<SortMode>('upcoming')
  const [editing, setEditing] = useState<Person | null>(null)
  const [creating, setCreating] = useState(false)
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Set<string>>(new Set())

  const load = () =>
    erinnerungenService
      .listPeople()
      .then(({ data }) => setPeople(data.people))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const sortedPeople = useMemo(() => {
    const collator = new Intl.Collator('de', { sensitivity: 'base' })
    return [...people].sort((a, b) => {
      if (sortMode === 'firstName') return collator.compare(a.firstName, b.firstName)
      if (sortMode === 'lastName') return collator.compare(a.lastName ?? '', b.lastName ?? '')
      return a.daysUntilBirthday - b.daysUntilBirthday
    })
  }, [people, sortMode])

  // Speichert nur — Modal schließt/lädt erst über handleSaved, nachdem
  // PersonForm auch ein eventuelles Foto hochgeladen hat (sonst zeigt
  // die Liste kurz den Stand ohne Foto).
  const handleSave = async (input: PersonInput): Promise<Person> => {
    const { data } = editing
      ? await erinnerungenService.updatePerson(editing.id, input)
      : await erinnerungenService.createPerson(input)
    return data.person
  }

  const handleSaved = async () => {
    setEditing(null)
    setCreating(false)
    await load()
  }

  const handleDelete = async () => {
    if (!editing) return
    await erinnerungenService.deletePerson(editing.id)
    setEditing(null)
    await load()
  }

  const handleCongrats = async (event: MouseEvent, person: Person) => {
    event.stopPropagation()
    await erinnerungenService.setCongrats(person.id, new Date().getUTCFullYear(), true)
    await load()
  }

  return (
    <div>
      <div className="farsi-toolbar">
        <p className="erinnerungen-count">{people.length} Geburtstage</p>
        <Button onClick={() => setCreating(true)}>+ Neue Person</Button>
      </div>

      <div className="farsi-sort-toggle" role="group" aria-label="Sortierung">
        <span className="farsi-sort-toggle__label">Sortieren:</span>
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

      {loading ? (
        <p>Lädt…</p>
      ) : sortedPeople.length === 0 ? (
        <p className="admin-empty-state">Noch keine Geburtstage angelegt.</p>
      ) : (
        <div className="farsi-entry-list">
          {sortedPeople.map((person) => (
            <Card key={person.id} className="erinnerungen-person-card" onClick={() => setEditing(person)}>
              <div className="erinnerungen-person-card__photo">
                {person.photoUrl && !brokenPhotoIds.has(person.id) ? (
                  <img
                    src={person.photoUrl}
                    alt=""
                    onError={() => setBrokenPhotoIds((current) => new Set(current).add(person.id))}
                  />
                ) : (
                  <span>{person.firstName.charAt(0)}</span>
                )}
              </div>
              <div className="erinnerungen-person-card__info">
                <span className="erinnerungen-person-card__name">
                  {person.firstName} {person.lastName}
                </span>
                <span className="erinnerungen-person-card__meta">
                  {formatBirthday(person.birthday)} · wird {person.turningAge} · {formatDaysUntil(person.daysUntilBirthday)}
                </span>
              </div>
              {person.daysUntilBirthday === 0 && !person.congratulatedThisYear && (
                <button type="button" className="erinnerungen-congrats-btn" onClick={(event) => handleCongrats(event, person)}>
                  Gratuliert ✅
                </button>
              )}
              {person.congratulatedThisYear && person.daysUntilBirthday === 0 && (
                <span className="erinnerungen-congrats-done">Gratuliert ✅</span>
              )}
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <PersonModal
          person={editing}
          onSave={handleSave}
          onSaved={handleSaved}
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
