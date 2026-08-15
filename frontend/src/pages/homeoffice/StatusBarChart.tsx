import { useState, MouseEvent, FocusEvent } from 'react'
import type { WorkDayStatus } from '@app-types/homeoffice'
import { STATUS_META, STATUS_ORDER } from './status'

export interface StatusBarRow {
  key: string
  label: string
  counts: Record<WorkDayStatus, number>
  totalWorkdays: number
}

interface Segment {
  key: string
  label: string
  value: number
  color: string
}

interface TooltipState {
  x: number
  y: number
  label: string
  value: number
}

const UNKNOWN_COLOR = 'var(--color-surface-alt)'

// Horizontaler Stacked-Bar-Chart je Zeile (z.B. ein Jahr), Segmente nach
// Tagesart. Breite ist relativ zur Gesamtzahl der Werktage im Jahr (nicht nur
// zu den bereits erfassten Tagen) — ein "Nicht erfasst"-Segment in neutralem
// Grau füllt den Rest, damit ein kaum ausgefülltes Jahr nicht fälschlich als
// "100% Feiertag" wirkt. Farben/Reihenfolge folgen dem dataviz-Skill: fixe
// kategoriale Reihenfolge, 2px Surface-Gap zwischen Segmenten, gerundete
// Enden nur an den äußeren Kanten, Legende immer sichtbar, Hover/Fokus-Tooltip.
export function StatusBarChart({ rows }: { rows: StatusBarRow[] }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const showTooltip = (
    event: MouseEvent<HTMLDivElement> | FocusEvent<HTMLDivElement>,
    label: string,
    value: number,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setTooltip({ x: rect.left + rect.width / 2, y: rect.top, label, value })
  }

  return (
    <div className="status-bar-chart">
      {rows.map((row) => {
        const known = STATUS_ORDER.reduce((sum, status) => sum + row.counts[status], 0)
        const unknown = Math.max(row.totalWorkdays - known, 0)

        const segments: Segment[] = STATUS_ORDER.filter((status) => row.counts[status] > 0).map(
          (status) => ({
            key: status,
            label: STATUS_META[status].label,
            value: row.counts[status],
            color: `var(${STATUS_META[status].colorVar})`,
          }),
        )
        if (unknown > 0) {
          segments.push({ key: 'unknown', label: 'Nicht erfasst', value: unknown, color: UNKNOWN_COLOR })
        }

        return (
          <div key={row.key} className="status-bar-chart__row">
            <span className="status-bar-chart__row-label">{row.label}</span>
            <div
              className="status-bar-chart__bar"
              role="img"
              aria-label={`${row.label}: ${known} von ${row.totalWorkdays} Werktagen erfasst`}
            >
              {segments.map((segment, index) => {
                const widthPercent = row.totalWorkdays > 0 ? (segment.value / row.totalWorkdays) * 100 : 0

                return (
                  <div
                    key={segment.key}
                    className="status-bar-chart__segment"
                    tabIndex={0}
                    role="img"
                    aria-label={`${segment.label}: ${segment.value} Tage`}
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: segment.color,
                      borderTopLeftRadius: index === 0 ? 4 : 0,
                      borderBottomLeftRadius: index === 0 ? 4 : 0,
                      borderTopRightRadius: index === segments.length - 1 ? 4 : 0,
                      borderBottomRightRadius: index === segments.length - 1 ? 4 : 0,
                    }}
                    onMouseEnter={(event) => showTooltip(event, segment.label, segment.value)}
                    onFocus={(event) => showTooltip(event, segment.label, segment.value)}
                    onMouseLeave={() => setTooltip(null)}
                    onBlur={() => setTooltip(null)}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="status-bar-chart__legend">
        {STATUS_ORDER.map((status) => {
          const meta = STATUS_META[status]
          return (
            <span key={status} className="status-bar-chart__legend-item">
              <span
                className="status-bar-chart__legend-swatch"
                style={{ backgroundColor: `var(${meta.colorVar})` }}
              />
              {meta.icon} {meta.label}
            </span>
          )
        })}
        <span className="status-bar-chart__legend-item">
          <span className="status-bar-chart__legend-swatch" style={{ backgroundColor: UNKNOWN_COLOR }} />
          Nicht erfasst
        </span>
      </div>

      {tooltip && (
        <div className="status-bar-chart__tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <strong>{tooltip.value}</strong> {tooltip.label}
        </div>
      )}
    </div>
  )
}
