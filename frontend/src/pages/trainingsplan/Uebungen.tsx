import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trainingsplanService } from '@services/trainingsplan.service'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { EQUIPMENT_ALL, NO_EQUIPMENT, UNIT_META, matchesExerciseFilter } from './format'
import { useEquipment } from './useEquipment'
import { EquipmentModal } from './EquipmentModal'
import { useFocusAreas } from './useFocusAreas'
import { BereicheModal } from './BereicheModal'
import type { Exercise } from '@app-types/trainingsplan'

export function Uebungen() {
  const navigate = useNavigate()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  // Mehrfachauswahl, ODER-verknüpft (eine Übung passt, wenn sie IRGENDEINEN
  // der ausgewählten Fokusbereiche hat) — gleiches Muster wie die
  // Kategorie-Filter im Kochbuch.
  const [focusFilter, setFocusFilter] = useState<string[]>([])
  const [areasModalOpen, setAreasModalOpen] = useState(false)
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false)
  const [equipmentFilter, setEquipmentFilter] = useState(EQUIPMENT_ALL)
  const { items: equipmentItems, nameFor, reload: reloadEquipment } = useEquipment()
  const { areas, metaFor, reload: reloadAreas } = useFocusAreas()
  const [showArchived, setShowArchived] = useState(false)
  const [focusPickerOpen, setFocusPickerOpen] = useState(false)

  const load = () =>
    trainingsplanService
      .listExercises({ includeArchived: true })
      .then(({ data }) => setExercises(data.exercises))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const toggleFocus = (option: string) =>
    setFocusFilter((current) => (current.includes(option) ? current.filter((f) => f !== option) : [...current, option]))

  const filteredExercises = useMemo(() => {
    let result = exercises
    if (!showArchived) {
      result = result.filter((e) => !e.isArchived)
    }
    result = result.filter((e) => matchesExerciseFilter(e, focusFilter, equipmentFilter))
    const needle = search.trim().toLowerCase()
    if (needle) {
      result = result.filter((e) => e.name.toLowerCase().includes(needle))
    }
    return result
  }, [exercises, showArchived, focusFilter, equipmentFilter, search])

  return (
    <div>
      <div className="farsi-toolbar">
        <Input
          id="uebung-search"
          placeholder="Übung suchen…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="farsi-search-input"
        />
        <div className="trainingsplan-toolbar-actions">
          <Button variant="secondary" onClick={() => setAreasModalOpen(true)}>
            Bereiche verwalten
          </Button>
          <Button variant="secondary" onClick={() => setEquipmentModalOpen(true)}>
            Geräte verwalten
          </Button>
          <Button onClick={() => navigate('/trainingsplan/uebungen/neu')}>+ Neue Übung</Button>
        </div>
      </div>

      <div className="trainingsplan-filter-bar">
        <div className="farsi-filters">
          <div className="farsi-filters__chips farsi-filters__chips--desktop">
            <button
              type="button"
              className={`tool-chip ${focusFilter.length === 0 ? 'is-active' : ''}`.trim()}
              onClick={() => setFocusFilter([])}
            >
              Alle
            </button>
            {areas.map(({ key: option, name, icon }) => (
              <button
                key={option}
                type="button"
                className={`tool-chip ${focusFilter.includes(option) ? 'is-active' : ''}`.trim()}
                onClick={() => toggleFocus(option)}
              >
                {icon} {name}
              </button>
            ))}
          </div>
          <button type="button" className="farsi-filters__trigger" onClick={() => setFocusPickerOpen(true)}>
            Fokus{focusFilter.length > 0 ? ` (${focusFilter.length})` : ''} ▾
          </button>
        </div>

        {equipmentItems.length > 0 && (
          <div className="trainingsplan-equipment-filter">
            <button
              type="button"
              className={`tool-chip ${equipmentFilter === EQUIPMENT_ALL ? 'is-active' : ''}`.trim()}
              onClick={() => setEquipmentFilter(EQUIPMENT_ALL)}
            >
              Alle Geräte
            </button>
            {equipmentItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`tool-chip ${equipmentFilter === item.key ? 'is-active' : ''}`.trim()}
                onClick={() => setEquipmentFilter(item.key)}
              >
                {item.name}
              </button>
            ))}
            <button
              type="button"
              className={`tool-chip ${equipmentFilter === NO_EQUIPMENT ? 'is-active' : ''}`.trim()}
              onClick={() => setEquipmentFilter(NO_EQUIPMENT)}
            >
              Ohne Gerät
            </button>
          </div>
        )}

        <div className="trainingsplan-category-filter">
          <button
            type="button"
            className={`tool-chip trainingsplan-archived-chip ${showArchived ? 'is-active' : ''}`.trim()}
            onClick={() => setShowArchived((current) => !current)}
          >
            📦 Archivierte anzeigen
          </button>
        </div>
      </div>

      {loading ? (
        <p>Lädt…</p>
      ) : filteredExercises.length === 0 ? (
        <p className="admin-empty-state">
          {exercises.length === 0 ? 'Noch keine Übungen angelegt.' : 'Keine Übungen gefunden.'}
        </p>
      ) : (
        <div className="trainingsplan-grid">
          {filteredExercises.map((exercise) => (
            <Card
              key={exercise.id}
              className="trainingsplan-exercise-card"
              onClick={() => navigate(`/trainingsplan/uebungen/${exercise.id}`)}
            >
              {exercise.isArchived && <span className="trainingsplan-exercise-card__archived">Archiviert</span>}
              <div className="trainingsplan-exercise-card__photo">
                {exercise.imageUrl ? (
                  <img src={exercise.imageUrl} alt="" />
                ) : (
                  <span className="trainingsplan-exercise-card__photo-placeholder">🏋️</span>
                )}
              </div>
              <div className="trainingsplan-exercise-card__body">
                <span className="trainingsplan-exercise-card__title">{exercise.name}</span>
                <span className="trainingsplan-exercise-card__meta">
                  Einheit: {UNIT_META[exercise.unit].label}
                  {exercise.equipmentKey && ` · ${nameFor(exercise.equipmentKey)}`}
                </span>
                <div className="trainingsplan-exercise-card__tags">
                  {exercise.focusAreas.map((focus) => (
                    <span key={focus} className="tool-card__badge">
                      {metaFor(focus).icon} {metaFor(focus).name}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {equipmentModalOpen && (
        <EquipmentModal onClose={() => setEquipmentModalOpen(false)} onChanged={() => reloadEquipment()} />
      )}

      {areasModalOpen && <BereicheModal onClose={() => setAreasModalOpen(false)} onChanged={() => reloadAreas()} />}

      {focusPickerOpen && (
        <div className="farsi-modal-backdrop" onClick={() => setFocusPickerOpen(false)}>
          <div
            className="farsi-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Trainingsfokus auswählen"
          >
            <span className="farsi-modal__handle" aria-hidden="true" />
            <div className="farsi-filters__list-header">
              <span className="farsi-filters__list-title">Trainingsfokus</span>
              <button
                type="button"
                className="farsi-filters__list-reset"
                onClick={() => setFocusFilter([])}
                disabled={focusFilter.length === 0}
              >
                Zurücksetzen
              </button>
            </div>
            <div className="farsi-filters__list-body">
              {areas.map(({ key: option, name, icon }) => (
                <label key={option} className="farsi-filters__list-item">
                  <input type="checkbox" checked={focusFilter.includes(option)} onChange={() => toggleFocus(option)} />
                  <span>
                    {icon} {name}
                  </span>
                </label>
              ))}
            </div>
            <Button style={{ width: '100%', marginTop: 'var(--space-3)' }} onClick={() => setFocusPickerOpen(false)}>
              Fertig
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
