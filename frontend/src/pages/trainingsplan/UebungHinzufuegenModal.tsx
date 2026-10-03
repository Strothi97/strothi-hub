import { useEffect, useState } from 'react'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { trainingsplanService } from '@services/trainingsplan.service'
import { SetList } from './SetList'
import { EQUIPMENT_ALL, NO_EQUIPMENT, UNIT_META, formatShortDate, matchesExerciseFilter } from './format'
import { useFocusAreas } from './useFocusAreas'
import { useEquipment } from './useEquipment'
import type { Exercise, ExerciseHistoryEntry, TrainingSession } from '@app-types/trainingsplan'

// Im Edit-Modus (editing gesetzt) wird der Picker-Schritt übersprungen und
// "Speichern" ersetzt statt hängt an — gleiche Komponente dient so auch zum
// nachträglichen Korrigieren einer schon geloggten Übung (siehe Plan). Nur
// id/name/unit/secondaryUnit nötig (mehr zeigt diese Komponente nie an) — die
// aufrufende Seite (EinheitDetail.tsx) hat ohnehin nur diese Teilmenge zur
// Hand, aus der bereits geladenen Session heraus.
interface EditingSessionExercise {
  sessionExerciseId: string
  exercise: Pick<Exercise, 'id' | 'name' | 'unit' | 'secondaryUnit'>
  sets: { value: number | null; reps: number | null; secondaryValue: number | null }[]
}

interface UebungHinzufuegenModalProps {
  sessionId: string
  editing?: EditingSessionExercise
  onClose: () => void
  onAdded: (session: TrainingSession) => void
}

interface RoundInput {
  value: string
  reps: string
  secondaryValue: string
}

function emptyRound(): RoundInput {
  return { value: '', reps: '', secondaryValue: '' }
}

function roundsFromSets(sets: { value: number | null; reps: number | null; secondaryValue: number | null }[]): RoundInput[] {
  if (sets.length === 0) return [emptyRound()]
  return sets.map((s) => ({
    value: s.value?.toString() ?? '',
    reps: s.reps?.toString() ?? '',
    secondaryValue: s.secondaryValue?.toString() ?? '',
  }))
}

// Feature 5: Übung suchen/wählen -> "letztes Mal" zur Orientierung ->
// zunächst eine leere Runde, per "+" beliebig viele weitere.
export function UebungHinzufuegenModal({ sessionId, editing, onClose, onAdded }: UebungHinzufuegenModalProps) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loadingExercises, setLoadingExercises] = useState(!editing)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Pick<Exercise, 'id' | 'name' | 'unit' | 'secondaryUnit'> | null>(
    editing?.exercise ?? null,
  )
  const [lastTime, setLastTime] = useState<ExerciseHistoryEntry | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [rounds, setRounds] = useState<RoundInput[]>(editing ? roundsFromSets(editing.sets) : [emptyRound()])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { areas, metaFor } = useFocusAreas()
  const { items: equipmentItems, nameFor } = useEquipment()
  const [focusFilter, setFocusFilter] = useState<string[]>([])
  const [equipmentFilter, setEquipmentFilter] = useState(EQUIPMENT_ALL)

  useEffect(() => {
    if (editing) return
    trainingsplanService
      .listExercises()
      .then(({ data }) => setExercises(data.exercises))
      .finally(() => setLoadingExercises(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // "Letztes Mal" ist im Edit-Modus nicht relevant (man korrigiert ja schon
  // vorhandene Werte), daher nur im Anlege-Modus laden.
  useEffect(() => {
    if (!editing) return
    setLoadingHistory(true)
    trainingsplanService
      .getExerciseHistory(editing.exercise.id)
      .then(({ data }) => setLastTime(data.history.find((h) => h.sessionExerciseId !== editing.sessionExerciseId) ?? null))
      .finally(() => setLoadingHistory(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickExercise = (exercise: Exercise) => {
    setSelected(exercise)
    setRounds([emptyRound()])
    setLoadingHistory(true)
    trainingsplanService
      .getExerciseHistory(exercise.id)
      .then(({ data }) => setLastTime(data.history[0] ?? null))
      .finally(() => setLoadingHistory(false))
  }

  const filteredExercises = exercises.filter(
    (e) =>
      e.name.toLowerCase().includes(search.trim().toLowerCase()) &&
      matchesExerciseFilter(e, focusFilter, equipmentFilter),
  )

  const toggleFocusFilter = (key: string) =>
    setFocusFilter((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]))

  const updateRound = (index: number, field: keyof RoundInput, value: string) =>
    setRounds((current) => current.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  const addRound = () => setRounds((current) => [...current, emptyRound()])
  const removeRound = (index: number) => setRounds((current) => current.filter((_, i) => i !== index))

  const handleSave = async () => {
    if (!selected) return
    setError(null)
    const sets = rounds
      .filter((r) => r.value.trim() || r.reps.trim() || r.secondaryValue.trim())
      .map((r) => ({
        value: r.value.trim() ? Number(r.value) : null,
        reps: r.reps.trim() ? Number(r.reps) : null,
        secondaryValue: r.secondaryValue.trim() ? Number(r.secondaryValue) : null,
      }))
    if (sets.length === 0) {
      setError('Bitte mindestens eine Runde ausfüllen.')
      return
    }
    setSaving(true)
    try {
      const { data } = editing
        ? await trainingsplanService.updateSessionExerciseSets(sessionId, editing.sessionExerciseId, sets)
        : await trainingsplanService.addSessionExercise(sessionId, { exerciseId: selected.id, sets })
      onAdded(data.session)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="farsi-modal-backdrop" onClick={onClose}>
      <div
        className="farsi-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Übung hinzufügen"
      >
        <span className="farsi-modal__handle" aria-hidden="true" />

        {!selected ? (
          <>
            <div className="trainingsplan-modal-body">
              <h3>Übung auswählen</h3>
              <Input
                id="uebung-picker-search"
                placeholder="Übung suchen…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {areas.length > 0 && (
                <div className="trainingsplan-picker-filters">
                  <span className="form-label">Schwerpunkt</span>
                  <div className="farsi-filters__chips">
                    {areas.map((area) => (
                      <button
                        key={area.key}
                        type="button"
                        className={`tool-chip ${focusFilter.includes(area.key) ? 'is-active' : ''}`.trim()}
                        onClick={() => toggleFocusFilter(area.key)}
                      >
                        {area.icon} {area.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {equipmentItems.length > 0 && (
                <div className="trainingsplan-picker-filters">
                  <span className="form-label">Gerät</span>
                  <div className="farsi-filters__chips">
                    <button
                      type="button"
                      className={`tool-chip ${equipmentFilter === EQUIPMENT_ALL ? 'is-active' : ''}`.trim()}
                      onClick={() => setEquipmentFilter(EQUIPMENT_ALL)}
                    >
                      Alle
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
                </div>
              )}
              {loadingExercises ? (
                <p>Lädt…</p>
              ) : filteredExercises.length === 0 ? (
                <p className="admin-empty-state">
                  {exercises.length === 0 ? 'Noch keine Übungen im Katalog.' : 'Keine Übungen gefunden.'}
                </p>
              ) : (
                <div className="trainingsplan-picker-list">
                  {filteredExercises.map((exercise) => {
                    const primaryFocus = exercise.focusAreas[0]
                    return (
                      <button
                        type="button"
                        key={exercise.id}
                        className="trainingsplan-picker-item"
                        onClick={() => pickExercise(exercise)}
                      >
                        <span className="trainingsplan-picker-item__thumb">
                          {exercise.imageUrl ? (
                            <img src={exercise.imageUrl} alt="" />
                          ) : (
                            <span aria-hidden="true">{primaryFocus ? metaFor(primaryFocus).icon : '🏋️'}</span>
                          )}
                        </span>
                        <span className="trainingsplan-picker-item__body">
                          <span className="trainingsplan-picker-item__name">{exercise.name}</span>
                          <span className="trainingsplan-picker-item__meta">
                            {[
                              ...exercise.focusAreas.map((focus) => metaFor(focus).name),
                              ...(exercise.equipmentKey ? [nameFor(exercise.equipmentKey)] : []),
                            ].join(' · ')}
                          </span>
                        </span>
                        <span className="trainingsplan-picker-item__chevron" aria-hidden="true">
                          ›
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="farsi-modal__actions">
              <div className="farsi-modal__actions-right" style={{ width: '100%' }}>
                <Button type="button" variant="secondary" onClick={onClose}>
                  Abbrechen
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="trainingsplan-modal-body">
              <div className="trainingsplan-modal-title">
                {!editing && (
                  <button
                    type="button"
                    className="trainingsplan-back-btn"
                    onClick={() => setSelected(null)}
                    aria-label="Andere Übung wählen"
                    title="Andere Übung wählen"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <h3>{selected.name}</h3>
              </div>

              {loadingHistory ? (
                <p className="form-hint">Lädt letztes Mal…</p>
              ) : lastTime ? (
                <div className="trainingsplan-last-time">
                  <span className="trainingsplan-last-time__date">{formatShortDate(lastTime.performedAt)}</span>
                  <SetList sets={lastTime.sets} unit={selected.unit} secondaryUnit={selected.secondaryUnit} />
                </div>
              ) : (
                <p className="form-hint">Noch keine vorherige Einheit mit dieser Übung.</p>
              )}

              <div className="kochbuch-ingredient-list">
                {rounds.map((round, index) => (
                  <div key={index} className="kochbuch-ingredient-row">
                    {selected.unit !== 'BODYWEIGHT' && (
                      <input
                        type="number"
                        step="any"
                        className="input kochbuch-ingredient-row__amount"
                        placeholder={UNIT_META[selected.unit].label}
                        value={round.value}
                        onChange={(e) => updateRound(index, 'value', e.target.value)}
                      />
                    )}
                    <input
                      type="number"
                      className="input kochbuch-ingredient-row__amount"
                      placeholder="Wdh."
                      value={round.reps}
                      onChange={(e) => updateRound(index, 'reps', e.target.value)}
                    />
                    {selected.secondaryUnit && (
                      <input
                        type="number"
                        step="any"
                        className="input kochbuch-ingredient-row__amount"
                        placeholder={UNIT_META[selected.secondaryUnit].label}
                        value={round.secondaryValue}
                        onChange={(e) => updateRound(index, 'secondaryValue', e.target.value)}
                      />
                    )}
                    <button
                      type="button"
                      className="erinnerungen-lead-row__remove"
                      onClick={() => removeRound(index)}
                      aria-label="Runde entfernen"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="erinnerungen-time-add" onClick={addRound}>
                + Runde hinzufügen
              </button>

              {error && <p className="form-error">{error}</p>}
            </div>

            <div className="farsi-modal__actions">
              <div className="farsi-modal__actions-right" style={{ width: '100%' }}>
                <Button type="button" variant="secondary" onClick={onClose}>
                  Abbrechen
                </Button>
                <Button type="button" onClick={handleSave} disabled={saving}>
                  {saving ? 'Speichern…' : 'Speichern'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
