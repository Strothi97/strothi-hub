import { useEffect, useState } from 'react'
import { homeofficeService } from '@services/homeoffice.service'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { STATUS_META, STATUS_ORDER, chipStyle } from './status'
import type { ResolvedDay, WorkDayStatus } from '@app-types/homeoffice'

const WEEKDAY_LABELS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']

function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDayLabel(isoDate: string): string {
  const [, month, day] = isoDate.split('-')
  return `${day}.${month}.`
}

function formatRangeLabel(weekStart: string, weekEnd: string): string {
  const [, m1, d1] = weekStart.split('-')
  const [y2, m2, d2] = weekEnd.split('-')
  return `${d1}.${m1}. – ${d2}.${m2}.${y2}`
}

export function Woche() {
  const [referenceDate, setReferenceDate] = useState(() => toISODate(new Date()))
  const [days, setDays] = useState<ResolvedDay[]>([])
  const [range, setRange] = useState<{ weekStart: string; weekEnd: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [openDay, setOpenDay] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    homeofficeService
      .getWeek(referenceDate)
      .then(({ data }) => {
        setDays(data.days)
        setRange({ weekStart: data.weekStart, weekEnd: data.weekEnd })
      })
      .finally(() => setLoading(false))
  }, [referenceDate])

  const shiftWeek = (deltaWeeks: number) => {
    const [year, month, day] = referenceDate.split('-').map(Number)
    setReferenceDate(toISODate(new Date(year, month - 1, day + deltaWeeks * 7)))
  }

  const handleSetStatus = async (date: string, status: WorkDayStatus | null) => {
    const { data } = await homeofficeService.setDay(date, status)
    setDays((prev) => prev.map((day) => (day.date === date ? data.day : day)))
    setOpenDay(null)
  }

  return (
    <div>
      <div className="week-nav">
        <Button variant="secondary" onClick={() => shiftWeek(-1)} aria-label="Vorherige Woche">
          ← <span className="week-nav__btn-label">Vorherige</span>
        </Button>
        <div className="week-nav__label">
          <strong>{range && formatRangeLabel(range.weekStart, range.weekEnd)}</strong>
          <button
            type="button"
            className="week-nav__today"
            onClick={() => setReferenceDate(toISODate(new Date()))}
          >
            Heute
          </button>
        </div>
        <Button variant="secondary" onClick={() => shiftWeek(1)} aria-label="Nächste Woche">
          <span className="week-nav__btn-label">Nächste</span> →
        </Button>
      </div>

      {loading ? (
        <p>Lädt…</p>
      ) : (
        <div className="day-card-list">
          {days.map((day, index) => {
            const meta = day.status ? STATUS_META[day.status] : null
            const isOpen = openDay === day.date

            return (
              <Card key={day.date} className="day-card">
                <div className="day-card__header">
                  <div className="day-card__date-block">
                    <span className="day-card__weekday">{WEEKDAY_LABELS[index]}</span>
                    <span className="day-card__date">{formatDayLabel(day.date)}</span>
                  </div>
                  <button
                    type="button"
                    className="day-card__status-toggle"
                    style={meta ? chipStyle(day.status!) : undefined}
                    onClick={() => setOpenDay(isOpen ? null : day.date)}
                  >
                    {meta ? (
                      <>
                        <span>{meta.icon}</span> {meta.label}
                        {day.isAutoHoliday && <span className="day-card__auto-badge">automatisch</span>}
                      </>
                    ) : (
                      'Status wählen'
                    )}
                  </button>
                </div>

                {isOpen && (
                  <div className="day-card__options">
                    {STATUS_ORDER.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={`day-status-chip ${day.status === status ? 'is-active' : ''}`.trim()}
                        style={chipStyle(status)}
                        onClick={() => handleSetStatus(day.date, status)}
                      >
                        <span>{STATUS_META[status].icon}</span> {STATUS_META[status].label}
                      </button>
                    ))}
                    {day.status && (
                      <button
                        type="button"
                        className="day-status-chip"
                        onClick={() => handleSetStatus(day.date, null)}
                      >
                        Zurücksetzen
                      </button>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
