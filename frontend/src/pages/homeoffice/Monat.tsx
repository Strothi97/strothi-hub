import { useEffect, useState } from 'react'
import { homeofficeService } from '@services/homeoffice.service'
import { Button } from '@components/ui/Button'
import { STATUS_META, chipStyle } from './status'
import { DayStatusModal } from './DayStatusModal'
import type { ResolvedDay, WorkDayStatus } from '@app-types/homeoffice'

const WEEKDAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr']
const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

// Gruppiert die (bereits nur Werktage enthaltende) Tagesliste in Kalenderwochen-
// Zeilen zu je 5 Spalten (Mo–Fr) und füllt führende/fehlende Tage am Monatsanfang
// bzw. -ende mit `null`-Platzhaltern auf, damit das Raster sauber ausgerichtet bleibt.
function groupIntoWeekRows(days: ResolvedDay[]): (ResolvedDay | null)[][] {
  const rows: (ResolvedDay | null)[][] = []
  let currentRow: (ResolvedDay | null)[] = []

  for (const day of days) {
    const [year, month, dayOfMonth] = day.date.split('-').map(Number)
    const weekday = new Date(year, month - 1, dayOfMonth).getDay() // 1=Mo ... 5=Fr
    const column = weekday - 1

    if (column === 0 && currentRow.length > 0) {
      rows.push(currentRow)
      currentRow = []
    }
    while (currentRow.length < column) currentRow.push(null)
    currentRow.push(day)
  }

  if (currentRow.length > 0) {
    while (currentRow.length < 5) currentRow.push(null)
    rows.push(currentRow)
  }

  return rows
}

export function Monat() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [days, setDays] = useState<ResolvedDay[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    homeofficeService
      .getMonth(year, month)
      .then(({ data }) => setDays(data.days))
      .finally(() => setLoading(false))
  }, [year, month])

  const shiftMonth = (delta: number) => {
    let nextMonth = month + delta
    let nextYear = year
    if (nextMonth < 1) {
      nextMonth = 12
      nextYear -= 1
    } else if (nextMonth > 12) {
      nextMonth = 1
      nextYear += 1
    }
    setMonth(nextMonth)
    setYear(nextYear)
  }

  const goToday = () => {
    setYear(now.getFullYear())
    setMonth(now.getMonth() + 1)
  }

  const handleSelect = async (status: WorkDayStatus | null) => {
    if (!selectedDate) return
    const { data } = await homeofficeService.setDay(selectedDate, status)
    setDays((prev) => prev.map((day) => (day.date === selectedDate ? data.day : day)))
    setSelectedDate(null)
  }

  const rows = groupIntoWeekRows(days)
  const selectedDay = selectedDate ? days.find((day) => day.date === selectedDate) ?? null : null

  return (
    <div>
      <div className="month-nav">
        <Button variant="secondary" onClick={() => shiftMonth(-1)}>
          ←
        </Button>
        <div className="month-nav__label">
          <strong>
            {MONTH_NAMES[month - 1]} {year}
          </strong>
          <button type="button" className="week-nav__today" onClick={goToday}>
            Heute
          </button>
        </div>
        <Button variant="secondary" onClick={() => shiftMonth(1)}>
          →
        </Button>
      </div>

      {loading ? (
        <p>Lädt…</p>
      ) : (
        <div className="month-grid">
          <div className="month-grid__row month-grid__row--header">
            {WEEKDAY_HEADERS.map((label) => (
              <div key={label} className="month-grid__header-cell">
                {label}
              </div>
            ))}
          </div>
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="month-grid__row">
              {row.map((day, colIndex) =>
                day ? (
                  <button
                    key={day.date}
                    type="button"
                    className="month-day-tile"
                    style={day.status ? chipStyle(day.status) : undefined}
                    onClick={() => setSelectedDate(day.date)}
                    aria-label={`${day.date}: ${day.status ? STATUS_META[day.status].label : 'kein Status'}`}
                  >
                    <span className="month-day-tile__date">{day.date.slice(8, 10)}</span>
                    <span className="month-day-tile__icon">
                      {day.status ? STATUS_META[day.status].icon : ''}
                    </span>
                    {day.status && (
                      <span className="month-day-tile__label">{STATUS_META[day.status].label}</span>
                    )}
                  </button>
                ) : (
                  <div key={colIndex} className="month-day-tile month-day-tile--empty" aria-hidden="true" />
                ),
              )}
            </div>
          ))}
        </div>
      )}

      {selectedDate && (
        <DayStatusModal
          date={selectedDate}
          currentStatus={selectedDay?.status ?? null}
          onSelect={handleSelect}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}
