import { useEffect, useState } from 'react'
import { farsiService } from '@services/farsi.service'
import { Card } from '@components/ui/Card'
import { MODE_LABELS, BOX_LABELS, BOX_ORDER } from './studySession'
import type { FarsiBoxStats, FarsiStudyMode } from '@app-types/farsi'

const MODE_ORDER: FarsiStudyMode[] = ['VOCAB', 'SCRIPT']

export function Statistiken() {
  const [mode, setMode] = useState<FarsiStudyMode>('VOCAB')
  const [stats, setStats] = useState<FarsiBoxStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    farsiService
      .getBoxStats(mode)
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false))
  }, [mode])

  const maxCount = stats ? Math.max(stats.newCount, ...BOX_ORDER.map((box) => stats.byBox[box]), 1) : 1

  return (
    <div className="farsi-stats">
      <div className="farsi-study-mode-picker">
        {MODE_ORDER.map((option) => (
          <button
            key={option}
            type="button"
            className={`tool-chip ${mode === option ? 'is-active' : ''}`.trim()}
            onClick={() => setMode(option)}
          >
            {MODE_LABELS[option]}
          </button>
        ))}
      </div>

      {loading || !stats ? (
        <p>Lädt…</p>
      ) : (
        <>
          <p className="farsi-stats__summary">
            {stats.eligibleCount} Begriffe lernbar
            {!!stats.ineligibleCount && ` · ${stats.ineligibleCount} noch nicht vollständig genug`}
          </p>

          <Card className="farsi-stats__bars">
            <div className="farsi-stats__row">
              <span className="farsi-stats__row-label">Neu</span>
              <div className="farsi-stats__bar-track">
                <div
                  className="farsi-stats__bar-fill farsi-stats__bar-fill--new"
                  style={{ width: `${(stats.newCount / maxCount) * 100}%` }}
                />
              </div>
              <span className="farsi-stats__row-count">{stats.newCount}</span>
            </div>
            {BOX_ORDER.map((box) => (
              <div key={box} className="farsi-stats__row">
                <span className="farsi-stats__row-label">
                  Stufe {box} <small>({BOX_LABELS[box]})</small>
                </span>
                <div className="farsi-stats__bar-track">
                  <div
                    className="farsi-stats__bar-fill"
                    style={{ width: `${(stats.byBox[box] / maxCount) * 100}%` }}
                  />
                </div>
                <span className="farsi-stats__row-count">{stats.byBox[box]}</span>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  )
}
