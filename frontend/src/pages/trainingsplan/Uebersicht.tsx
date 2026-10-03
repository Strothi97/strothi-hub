import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { trainingsplanService } from '@services/trainingsplan.service'
import { Button } from '@components/ui/Button'
import { NeueEinheitModal } from './NeueEinheitModal'
import { computeWeekStreak, computeWeeklyFrequency, formatWeekdayDateTime, groupSessionsByWeek } from './format'
import type { SessionListItem } from '@app-types/trainingsplan'

export function Uebersicht() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    trainingsplanService
      .listSessions()
      .then(({ data }) => setSessions(data.sessions))
      .finally(() => setLoading(false))
  }, [])

  const streak = useMemo(() => computeWeekStreak(sessions), [sessions])
  const weeklyBuckets = useMemo(() => computeWeeklyFrequency(sessions, 12), [sessions])
  const maxCount = Math.max(1, ...weeklyBuckets.map((b) => b.count))
  const sessionGroups = useMemo(() => groupSessionsByWeek(sessions), [sessions])

  const newSessionModal = modalOpen && (
    <NeueEinheitModal
      onClose={() => setModalOpen(false)}
      onCreated={(session) => navigate(`/trainingsplan/einheiten/${session.id}`)}
    />
  )

  if (loading) return <p>Lädt…</p>

  if (sessions.length === 0) {
    return (
      <div>
        <div className="farsi-toolbar">
          <Button onClick={() => setModalOpen(true)}>+ Neue Einheit</Button>
        </div>
        <p className="admin-empty-state">Noch keine Trainingseinheit geloggt.</p>
        {newSessionModal}
      </div>
    )
  }

  return (
    <div>
      <div className="farsi-toolbar">
        <Button onClick={() => setModalOpen(true)}>+ Neue Einheit</Button>
      </div>

      <div className="trainingsplan-overview-stats">
        <div className="trainingsplan-stat-tile">
          <span className="trainingsplan-stat-tile__value">{sessions.length}</span>
          <span className="trainingsplan-stat-tile__label">Einheiten insgesamt</span>
        </div>
        <div className="trainingsplan-stat-tile">
          <span className="trainingsplan-stat-tile__value">{streak}</span>
          <span className="trainingsplan-stat-tile__label">
            {streak === 1 ? 'Woche' : 'Wochen'} in Folge trainiert
          </span>
        </div>
      </div>

      <section className="kochbuch-detail__section">
        <h3>Trainingshäufigkeit (letzte 12 Wochen)</h3>
        <div className="trainingsplan-frequency-chart" role="img" aria-label="Einheiten pro Woche, letzte 12 Wochen">
          {weeklyBuckets.map((bucket) => (
            <div key={bucket.weekStart} className="trainingsplan-frequency-chart__col">
              <div
                className="trainingsplan-frequency-chart__bar"
                style={{ height: `${(bucket.count / maxCount) * 100}%` }}
                title={`${bucket.count} Einheit${bucket.count === 1 ? '' : 'en'}`}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="kochbuch-detail__section">
        <h3>Einheiten</h3>
        <div className="trainingsplan-week-groups">
          {sessionGroups.map((group) => (
            <div key={group.key} className="trainingsplan-week-group">
              <div className="trainingsplan-week-group__header">
                <span>KW {group.weekNumber}</span>
              </div>
              <ul className="kochbuch-ingredient-view-list">
                {group.sessions.map((session) => (
                  <li key={session.id}>
                    <Link to={`/trainingsplan/einheiten/${session.id}`} className="trainingsplan-session-link">{formatWeekdayDateTime(session.performedAt)}</Link>
                    <span className="kochbuch-ingredient-view-list__amount">
                      {session.exerciseCount} Übung{session.exerciseCount === 1 ? '' : 'en'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {newSessionModal}
    </div>
  )
}
