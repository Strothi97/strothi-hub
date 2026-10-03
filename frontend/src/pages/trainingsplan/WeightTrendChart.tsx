import { useState } from 'react'

export interface TrendPoint {
  date: string // bereits formatiert (z.B. "Mo, 12.03.2026"), fürs Tooltip
  label: string // kompakt (z.B. "12.03."), für die X-Achsen-Beschriftung
  value: number
}

interface TooltipState {
  x: number
  y: number
  label: string
  value: number
}

const WIDTH = 600
const HEIGHT = 200
const PADDING_LEFT = 40
const PADDING_RIGHT = 12
const PADDING_TOP = 16
const PADDING_BOTTOM = 28
const MAX_X_LABELS = 6

// Handgebauter SVG-Liniendiagramm für eine einzelne Kennzahl über Zeit (z.B.
// Gewicht/1RM je Trainingseinheit) — einzelne Serie, daher keine Legende
// nötig (Titel außerhalb der Komponente benennt sie), dünne 2px-Linie,
// Marker erst ab 8px Hit-Fläche, Hover-Tooltip statt Werten an jedem Punkt.
// Ordinale x-Achse (ein Punkt pro Einheit, gleich verteilt) statt echter
// Zeit-Skala — bei unregelmäßigen Trainingsabständen lesbarer als geklumpte
// Punkte. Y-Achse zeigt 3 Wert-Beschriftungen (min/mitte/max), X-Achse zeigt
// Datums-Beschriftungen — bei vielen Punkten selektiv ausgedünnt statt jeden
// Punkt zu labeln (Kollisionsvermeidung, gleiches Prinzip wie im
// dataviz-Skill: selektive statt vollständige Direkt-Beschriftung).
export function WeightTrendChart({ points, unit }: { points: TrendPoint[]; unit: string }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  if (points.length === 0) {
    return <p className="form-hint">Noch keine Daten für einen Verlauf.</p>
  }

  if (points.length === 1) {
    return (
      <p className="trainingsplan-chart-single">
        {points[0].value} {unit} <span className="form-hint">({points[0].date})</span>
      </p>
    )
  }

  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const yPad = range * 0.15

  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM

  const xFor = (index: number) => PADDING_LEFT + (points.length === 1 ? 0 : (index / (points.length - 1)) * plotWidth)
  const yFor = (value: number) => PADDING_TOP + plotHeight - ((value - min + yPad) / (range + yPad * 2)) * plotHeight

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.value)}`).join(' ')

  // Zwei recessive Gitterlinien (min/max) + eine mittlere, jeweils mit
  // Wert-Beschriftung links.
  const gridValues = [min, min + (max - min) / 2, max]

  // X-Achse: bei wenigen Punkten alle labeln, sonst gleichmäßig verteilt bis
  // max. MAX_X_LABELS ausdünnen (erster + letzter immer dabei).
  const xLabelIndices = new Set<number>()
  if (points.length <= MAX_X_LABELS) {
    points.forEach((_, i) => xLabelIndices.add(i))
  } else {
    const step = (points.length - 1) / (MAX_X_LABELS - 1)
    for (let i = 0; i < MAX_X_LABELS; i++) {
      xLabelIndices.add(Math.round(i * step))
    }
  }

  return (
    <div className="trainingsplan-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="trainingsplan-chart__svg" role="img" aria-label={`Verlauf in ${unit}`}>
        {gridValues.map((value, i) => (
          <g key={i}>
            <line
              x1={PADDING_LEFT}
              x2={WIDTH - PADDING_RIGHT}
              y1={yFor(value)}
              y2={yFor(value)}
              className="trainingsplan-chart__gridline"
            />
            <text x={PADDING_LEFT - 6} y={yFor(value)} dy="3" textAnchor="end" className="trainingsplan-chart__axis-label">
              {Math.round(value * 10) / 10} {unit}
            </text>
          </g>
        ))}
        <path d={linePath} className="trainingsplan-chart__line" fill="none" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            {/* Größerer, unsichtbarer Hit-Kreis (>=8px Radius) rund um den 4px-Marker. */}
            <circle
              cx={xFor(i)}
              cy={yFor(p.value)}
              r={10}
              fill="transparent"
              onMouseEnter={() => setTooltip({ x: xFor(i), y: yFor(p.value), label: p.date, value: p.value })}
              onMouseLeave={() => setTooltip(null)}
            />
            <circle cx={xFor(i)} cy={yFor(p.value)} r={4} className="trainingsplan-chart__marker" />
            {xLabelIndices.has(i) && (
              <text x={xFor(i)} y={HEIGHT - 8} textAnchor="middle" className="trainingsplan-chart__axis-label">
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {tooltip && (
        <div
          className="trainingsplan-chart__tooltip"
          style={{ left: `${(tooltip.x / WIDTH) * 100}%`, top: `${(tooltip.y / HEIGHT) * 100}%` }}
        >
          <strong>
            {tooltip.value} {unit}
          </strong>
          <span>{tooltip.label}</span>
        </div>
      )}
    </div>
  )
}
