import { useEffect, useState, FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Button } from '@components/ui/Button'
import { trainingsplanService } from '@services/trainingsplan.service'
import { UebungHinzufuegenModal } from './UebungHinzufuegenModal'
import { SetList } from './SetList'
import {
  computeSetVolume,
  formatWeekdayDateTime,
  isWeightUnit,
  isoWeekNumber,
  toDatetimeLocalValue,
} from './format'
import { useFocusAreas } from './useFocusAreas'
import type { SessionExerciseEntry, TrainingSession } from '@app-types/trainingsplan'

const FALLBACK_EXERCISE_ICON = '🏋️'

export function EinheitDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<TrainingSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<SessionExerciseEntry | null>(null)
  const [editingMeta, setEditingMeta] = useState(false)
  const [performedAt, setPerformedAt] = useState('')
  const [note, setNote] = useState('')
  const { metaFor } = useFocusAreas()

  const load = () =>
    trainingsplanService.getSession(id!).then(({ data }) => {
      setSession(data.session)
      setPerformedAt(toDatetimeLocalValue(new Date(data.session.performedAt)))
      setNote(data.session.note ?? '')
    })

  useEffect(() => {
    if (!id) return
    load().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleSaveMeta = async (event: FormEvent) => {
    event.preventDefault()
    if (!id) return
    const date = new Date(performedAt)
    if (Number.isNaN(date.getTime())) return
    const { data } = await trainingsplanService.updateSession(id, {
      performedAt: date.toISOString(),
      note: note.trim() || null,
    })
    setSession(data.session)
    setEditingMeta(false)
  }

  const handleRemoveExercise = async (sessionExerciseId: string) => {
    if (!id) return
    if (!window.confirm('Diese Übung aus der Einheit entfernen?')) return
    const { data } = await trainingsplanService.removeSessionExercise(id, sessionExerciseId)
    setSession(data.session)
  }

  const handleDeleteSession = async () => {
    if (!id) return
    if (!window.confirm('Diese Trainingseinheit wirklich löschen?')) return
    await trainingsplanService.deleteSession(id)
    navigate('/trainingsplan')
  }

  if (loading) return <p>Lädt…</p>
  if (!session) return <p className="admin-empty-state">Einheit nicht gefunden.</p>

  const totalSets = session.exercises.reduce((sum, se) => sum + se.sets.length, 0)
  const totalVolume = session.exercises.reduce(
    (sum, se) =>
      isWeightUnit(se.exercise.unit)
        ? sum + se.sets.reduce((setSum, s) => setSum + computeSetVolume(s.value, s.reps), 0)
        : sum,
    0,
  )

  return (
    <div className="kochbuch-detail">
      <div className="kochbuch-detail__header">
        <Link to="/trainingsplan" className="kochbuch-detail__back">
          ← Übersicht
        </Link>
        <div className="kochbuch-detail__header-actions">
          <Button variant="secondary" onClick={() => setEditingMeta((current) => !current)} title="Bearbeiten">
            ✏️ <span className="kochbuch-detail__action-label">Bearbeiten</span>
          </Button>
          <button type="button" className="farsi-modal__delete" onClick={handleDeleteSession}>
            Löschen
          </button>
        </div>
      </div>

      {editingMeta ? (
        <form onSubmit={handleSaveMeta} className="trainingsplan-session-meta-form">
          <div className="form-group">
            <label className="form-label" htmlFor="einheit-edit-performed-at">
              Datum + Uhrzeit
            </label>
            <input
              id="einheit-edit-performed-at"
              type="datetime-local"
              className="input"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="einheit-edit-note">
              Notiz (optional)
            </label>
            <input id="einheit-edit-note" type="text" className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button type="submit">Speichern</Button>
        </form>
      ) : (
        <header className="trainingsplan-session-hero">
          <span className="trainingsplan-session-hero__week">KW {isoWeekNumber(new Date(session.performedAt))}</span>
          <div>
            <h2 className="trainingsplan-session-hero__date">{formatWeekdayDateTime(session.performedAt)}</h2>
            {session.note && <p className="trainingsplan-session-hero__note">{session.note}</p>}
          </div>
        </header>
      )}

      <div className="trainingsplan-session-stats">
        <div className="trainingsplan-stat-tile">
          <span className="trainingsplan-stat-tile__value">{session.exercises.length}</span>
          <span className="trainingsplan-stat-tile__label">Übung{session.exercises.length === 1 ? '' : 'en'}</span>
        </div>
        <div className="trainingsplan-stat-tile">
          <span className="trainingsplan-stat-tile__value">{totalSets}</span>
          <span className="trainingsplan-stat-tile__label">Sätze</span>
        </div>
        {totalVolume > 0 && (
          <div className="trainingsplan-stat-tile">
            <span className="trainingsplan-stat-tile__value">
              {Math.round(totalVolume).toLocaleString('de-DE')} kg
            </span>
            <span className="trainingsplan-stat-tile__label">Volumen</span>
          </div>
        )}
      </div>

      <section className="kochbuch-detail__section">
        <h3>Ablauf</h3>

        {session.exercises.length === 0 ? (
          <p className="admin-empty-state">Noch keine Übung hinzugefügt.</p>
        ) : (
          <ol className="trainingsplan-timeline">
            {session.exercises.map((sessionExercise, index) => {
              const { exercise } = sessionExercise
              const primaryFocus = exercise.focusAreas[0]
              return (
                <li key={sessionExercise.id} className="trainingsplan-timeline__step">
                  <div className="trainingsplan-timeline__marker">{index + 1}</div>
                  <article className="trainingsplan-timeline__card">
                    <div className="trainingsplan-timeline__thumb">
                      {exercise.imageUrl ? (
                        <img src={exercise.imageUrl} alt="" />
                      ) : (
                        <span aria-hidden="true">{primaryFocus ? metaFor(primaryFocus).icon : FALLBACK_EXERCISE_ICON}</span>
                      )}
                    </div>
                    <div className="trainingsplan-timeline__body">
                      <div className="trainingsplan-timeline__header">
                        <Link to={`/trainingsplan/uebungen/${exercise.id}`} className="trainingsplan-timeline__title">
                          {exercise.name}
                        </Link>
                        <div className="trainingsplan-session-flow__actions">
                          <button
                            type="button"
                            className="trainingsplan-session-flow__icon-btn"
                            title="Bearbeiten"
                            onClick={() => setEditingExercise(sessionExercise)}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="trainingsplan-session-flow__icon-btn"
                            title="Entfernen"
                            onClick={() => handleRemoveExercise(sessionExercise.id)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <div className="trainingsplan-session-flow__tags">
                        {exercise.focusAreas.map((focus) => (
                          <span key={focus} className="tool-card__badge">
                            {metaFor(focus).icon} {metaFor(focus).name}
                          </span>
                        ))}
                      </div>
                      <SetList sets={sessionExercise.sets} unit={exercise.unit} secondaryUnit={exercise.secondaryUnit} />
                    </div>
                  </article>
                </li>
              )
            })}
          </ol>
        )}

        <button type="button" className="erinnerungen-time-add" onClick={() => setAddModalOpen(true)}>
          + Übung hinzufügen
        </button>
      </section>

      {addModalOpen && (
        <UebungHinzufuegenModal
          sessionId={session.id}
          onClose={() => setAddModalOpen(false)}
          onAdded={(updated) => {
            setSession(updated)
            setAddModalOpen(false)
          }}
        />
      )}

      {editingExercise && (
        <UebungHinzufuegenModal
          sessionId={session.id}
          editing={{
            sessionExerciseId: editingExercise.id,
            exercise: {
              id: editingExercise.exercise.id,
              name: editingExercise.exercise.name,
              unit: editingExercise.exercise.unit,
              secondaryUnit: editingExercise.exercise.secondaryUnit,
            },
            sets: editingExercise.sets.map((s) => ({ value: s.value, reps: s.reps, secondaryValue: s.secondaryValue })),
          }}
          onClose={() => setEditingExercise(null)}
          onAdded={(updated) => {
            setSession(updated)
            setEditingExercise(null)
          }}
        />
      )}
    </div>
  )
}
