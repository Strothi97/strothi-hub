import { useEffect, useMemo, useState, FormEvent } from 'react'
import { homeofficeService } from '@services/homeoffice.service'
import { useAuth } from '@context/AuthContext'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { StatusBarChart } from './StatusBarChart'
import { STATUS_META, STATUS_ORDER } from './status'
import { toISODate } from './constants'
import { findGaps } from './gaps'
import type { WorkDayStatus, YearAggregation } from '@app-types/homeoffice'

const emptyForm = { amount: '', reason: '' }

export function Jahr() {
  const { user } = useAuth()
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [data, setData] = useState<Record<number, YearAggregation>>({})
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const years = [year, year - 1, year - 2]

  const load = async () => {
    setLoading(true)
    const results = await Promise.all(years.map((y) => homeofficeService.getYear(y)))
    const map: Record<number, YearAggregation> = {}
    results.forEach((res, index) => {
      map[years[index]] = res.data
    })
    setData(map)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year])

  const handleCreateAdjustment = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    const amount = Number(form.amount)
    if (!amount || !form.reason.trim()) {
      setFormError('Bitte Anzahl und Grund angeben')
      return
    }
    try {
      await homeofficeService.createAdjustment({ year, amount, reason: form.reason })
      setForm(emptyForm)
      load()
    } catch {
      setFormError('Konnte nicht gespeichert werden')
    }
  }

  const handleDeleteAdjustment = async (id: string) => {
    await homeofficeService.deleteAdjustment(id)
    load()
  }

  const handleDownloadPdf = async () => {
    if (!current) return
    setExporting(true)
    try {
      // Dynamisch geladen: jsPDF zieht html2canvas/dompurify mit, das würde
      // sonst jede Seite unnötig aufblähen, obwohl es nur hier gebraucht wird.
      const { generateYearPdf } = await import('./pdf')
      generateYearPdf(current, user?.name ?? '')
    } finally {
      setExporting(false)
    }
  }

  const current = data[year]

  const todayIso = useMemo(() => toISODate(new Date()), [])

  const { elapsedCounts, elapsedTotal } = useMemo(() => {
    const counts: Record<WorkDayStatus, number> = {
      OFFICE: 0,
      HOME_OFFICE: 0,
      HOLIDAY: 0,
      PUBLIC_HOLIDAY: 0,
      SICK: 0,
    }
    if (!current) return { elapsedCounts: counts, elapsedTotal: 0 }
    const elapsedDays = current.days.filter((day) => day.date < todayIso)
    for (const day of elapsedDays) {
      if (day.status) counts[day.status] += 1
    }
    return { elapsedCounts: counts, elapsedTotal: elapsedDays.length }
  }, [current, todayIso])

  const gapReport = useMemo(() => {
    if (!current) return { months: [], weeks: [], days: [] }
    return findGaps(current.days, todayIso)
  }, [current, todayIso])

  const chartRows = years
    .filter((y) => data[y])
    .map((y) => ({
      key: String(y),
      label: String(y),
      counts: data[y].counts,
      totalWorkdays: data[y].totalWorkdays,
    }))

  return (
    <div>
      <div className="year-nav">
        <Button variant="secondary" onClick={() => setYear((y) => y - 1)}>
          ← {year - 1}
        </Button>
        <strong className="year-nav__label">{year}</strong>
        <Button variant="secondary" onClick={() => setYear((y) => y + 1)}>
          {year + 1} →
        </Button>
      </div>

      {loading ? (
        <p>Lädt…</p>
      ) : (
        <>
          <Card className="year-chart-card">
            <h2>Vergleich der letzten 3 Jahre</h2>
            <StatusBarChart rows={chartRows} />
          </Card>

          {current && (
            <Card className="year-table-card">
              <div className="year-table-card__header">
                <h2>Aufschlüsselung {year}</h2>
                <Button variant="secondary" className="btn-sm" onClick={handleDownloadPdf} disabled={exporting}>
                  {exporting ? 'Erstelle PDF…' : '📄 Als PDF herunterladen'}
                </Button>
              </div>
              <table className="year-breakdown-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Tage</th>
                    <th>Anteil Jahr</th>
                    <th>Anteil bisher</th>
                  </tr>
                </thead>
                <tbody>
                  {STATUS_ORDER.map((status) => {
                    const value = current.counts[status]
                    const percent =
                      current.totalWorkdays > 0 ? Math.round((value / current.totalWorkdays) * 100) : 0
                    const elapsedValue = elapsedCounts[status]
                    const percentSoFar =
                      elapsedTotal > 0 ? Math.round((elapsedValue / elapsedTotal) * 100) : null
                    return (
                      <tr key={status}>
                        <td>
                          <span
                            className="year-breakdown-table__swatch"
                            style={{ backgroundColor: `var(${STATUS_META[status].colorVar})` }}
                          />
                          {STATUS_META[status].icon} {STATUS_META[status].label}
                        </td>
                        <td>{value}</td>
                        <td>{percent}%</td>
                        <td>{percentSoFar === null ? '–' : `${percentSoFar}%`}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="year-summary year-summary--muted">
                "Anteil bisher" bezieht sich auf die {elapsedTotal} Werktage von Jahresbeginn bis
                gestern.
              </p>
              <p className="year-summary">
                Effektive Urlaubstage: <strong>{current.effectiveHolidayDays}</strong>
                {current.adjustmentTotal !== 0 && (
                  <>
                    {' '}
                    ({current.counts.HOLIDAY} eingetragen {current.adjustmentTotal > 0 ? '+' : ''}
                    {current.adjustmentTotal} Korrektur)
                  </>
                )}
              </p>
            </Card>
          )}

          <Card className="year-gaps-card">
            <h2>Lücken bis heute</h2>
            {gapReport.months.length === 0 && gapReport.weeks.length === 0 && gapReport.days.length === 0 ? (
              <p className="admin-empty-state">Keine Lücken — alles bis heute erfasst 🎉</p>
            ) : (
              <>
                {gapReport.months.length > 0 && (
                  <div className="gap-group">
                    <h3>Ganze Monate ohne Einträge</h3>
                    <ul className="gap-list">
                      {gapReport.months.map((entry) => (
                        <li key={entry.key}>{entry.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {gapReport.weeks.length > 0 && (
                  <div className="gap-group">
                    <h3>Ganze Wochen ohne Einträge</h3>
                    <ul className="gap-list">
                      {gapReport.weeks.map((entry) => (
                        <li key={entry.key}>{entry.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {gapReport.days.length > 0 && (
                  <div className="gap-group">
                    <h3>Einzelne fehlende Tage</h3>
                    <ul className="gap-list">
                      {gapReport.days.map((entry) => (
                        <li key={entry.key}>{entry.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card className="year-adjustments-card">
            <h2>Zusätzliche Urlaubstage {year}</h2>
            <form onSubmit={handleCreateAdjustment} className="adjustment-form">
              <Input
                id="adjustment-amount"
                label="Anzahl Tage (+/-)"
                type="number"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
              />
              <Input
                id="adjustment-reason"
                label="Grund"
                value={form.reason}
                onChange={(event) => setForm({ ...form, reason: event.target.value })}
                placeholder="z.B. Umzug, Rest aus 2024"
              />
              {formError && <p className="form-error">{formError}</p>}
              <Button type="submit">Hinzufügen</Button>
            </form>

            {current && current.adjustments.length > 0 && (
              <ul className="adjustment-list">
                {current.adjustments.map((adjustment) => (
                  <li key={adjustment.id}>
                    <span>
                      {adjustment.amount > 0 ? '+' : ''}
                      {adjustment.amount} Tage — {adjustment.reason}
                    </span>
                    <button type="button" onClick={() => handleDeleteAdjustment(adjustment.id)}>
                      Entfernen
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
