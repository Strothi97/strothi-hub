import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Button } from '@components/ui/Button'
import { trainingsplanService } from '@services/trainingsplan.service'
import { UebungInfoModal } from './UebungInfoModal'
import { SetList } from './SetList'
import { WeightTrendChart, type TrendPoint } from './WeightTrendChart'
import { UNIT_META, estimate1RM, formatDate, formatShortDate, formatWeekdayShort, isWeightUnit } from './format'
import { useFocusAreas } from './useFocusAreas'
import type { Exercise, ExerciseHistoryEntry } from '@app-types/trainingsplan'

export function UebungDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [infoOpen, setInfoOpen] = useState(false)
  const [aggregation, setAggregation] = useState<'best' | 'avg'>('best')
  const { metaFor } = useFocusAreas()

  useEffect(() => {
    if (!id) return
    Promise.all([trainingsplanService.getExercise(id), trainingsplanService.getExerciseHistory(id)])
      .then(([exerciseRes, historyRes]) => {
        setExercise(exerciseRes.data.exercise)
        setHistory(historyRes.data.history)
      })
      .finally(() => setLoading(false))
  }, [id])

  // Bei Körpergewicht-Übungen gibt es keinen Wert (value ist immer null) —
  // dort dienen die Wiederholungen als Verlaufs-Metrik, sonst der Wert in
  // der Haupteinheit. "Bestwert" = höchster Wert/höchste Wdh.-Zahl unter den
  // Runden dieser Einheit, "Durchschnitt" = deren Mittelwert (gerundet).
  const chartUnitLabel = exercise && exercise.unit === 'BODYWEIGHT' ? 'Wdh.' : exercise ? UNIT_META[exercise.unit].label : ''

  const trendPoints: TrendPoint[] = useMemo(() => {
    if (!exercise) return []
    const isBodyweight = exercise.unit === 'BODYWEIGHT'
    return [...history]
      .reverse() // history kommt neueste zuerst, Chart will chronologisch
      .map((entry) => {
        const values = entry.sets
          .map((s) => (isBodyweight ? s.reps : s.value))
          .filter((v): v is number => v !== null)
        if (values.length === 0) return null
        const aggregated =
          aggregation === 'best'
            ? Math.max(...values)
            : Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10
        return { date: formatDate(entry.performedAt), label: formatShortDate(entry.performedAt), value: aggregated }
      })
      .filter((p): p is TrendPoint => p !== null)
  }, [history, exercise, aggregation])

  const best1RM = useMemo(() => {
    if (!exercise || !isWeightUnit(exercise.unit)) return null
    let best = 0
    for (const entry of history) {
      for (const set of entry.sets) {
        if (set.value !== null && set.reps !== null && set.reps > 0) {
          best = Math.max(best, estimate1RM(set.value, set.reps))
        }
      }
    }
    return best > 0 ? Math.round(best * 10) / 10 : null
  }, [exercise, history])

  if (loading) return <p>Lädt…</p>
  if (!exercise) return <p className="admin-empty-state">Übung nicht gefunden.</p>

  return (
    <div className="kochbuch-detail">
      {exercise.isArchived && (
        <p className="kochbuch-incomplete-banner">⚠️ Diese Übung ist archiviert — sie kann Einheiten nicht mehr neu hinzugefügt werden.</p>
      )}

      <div className="kochbuch-detail__header">
        <Link to="/trainingsplan/uebungen" className="kochbuch-detail__back">
          ← Zurück
        </Link>
        <div className="kochbuch-detail__header-actions">
          <Button
            variant="secondary"
            onClick={() => navigate(`/trainingsplan/uebungen/${exercise.id}/bearbeiten`)}
            title="Bearbeiten"
          >
            ✏️ <span className="kochbuch-detail__action-label">Bearbeiten</span>
          </Button>
          {exercise.infoSections.length > 0 && (
            <Button onClick={() => setInfoOpen(true)} title="So geht's">
              ℹ️ <span className="kochbuch-detail__action-label">So geht's</span>
            </Button>
          )}
        </div>
      </div>

      {exercise.imageUrl && (
        <div className="trainingsplan-detail-photo">
          <img src={exercise.imageUrl} alt={exercise.name} />
        </div>
      )}

      <h2 className="kochbuch-detail__title">{exercise.name}</h2>

      <p className="kochbuch-detail__meta">Einheit: {UNIT_META[exercise.unit].label}</p>

      <div className="kochbuch-detail__tags">
        {exercise.focusAreas.map((focus) => (
          <span key={focus} className="tool-card__badge">
            {metaFor(focus).icon} {metaFor(focus).name}
          </span>
        ))}
      </div>

      <section className="kochbuch-detail__section">
        <div className="kochbuch-detail__section-header">
          <h3>Verlauf</h3>
          <div className="farsi-filters__chips">
            <button
              type="button"
              className={`tool-chip ${aggregation === 'best' ? 'is-active' : ''}`.trim()}
              onClick={() => setAggregation('best')}
            >
              Bestwert
            </button>
            <button
              type="button"
              className={`tool-chip ${aggregation === 'avg' ? 'is-active' : ''}`.trim()}
              onClick={() => setAggregation('avg')}
            >
              Durchschnitt
            </button>
          </div>
        </div>
        <WeightTrendChart points={trendPoints} unit={chartUnitLabel} />
        {best1RM !== null && (
          <p className="form-hint">Geschätztes 1RM (bestes bisheriges): {best1RM} {UNIT_META[exercise.unit].label}</p>
        )}
      </section>

      <section className="kochbuch-detail__section">
        <h3>Letzte Trainingseinheiten</h3>
        {history.length === 0 ? (
          <p className="admin-empty-state">Noch nicht geloggt.</p>
        ) : (
          <ul className="trainingsplan-history-list">
            {history.map((entry) => (
              <li key={entry.sessionExerciseId} className="trainingsplan-history-row">
                <Link to={`/trainingsplan/einheiten/${entry.sessionId}`} className="trainingsplan-history-row__date">
                  <span className="trainingsplan-history-row__weekday">{formatWeekdayShort(entry.performedAt)}</span>
                  <span>{formatShortDate(entry.performedAt)}</span>
                </Link>
                <SetList sets={entry.sets} unit={exercise.unit} secondaryUnit={exercise.secondaryUnit} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {infoOpen && <UebungInfoModal exercise={exercise} onClose={() => setInfoOpen(false)} />}
    </div>
  )
}
