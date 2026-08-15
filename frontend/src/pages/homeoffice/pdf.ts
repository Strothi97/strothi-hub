import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { STATUS_META, STATUS_ORDER } from './status'
import type { YearAggregation } from '@app-types/homeoffice'

// jspdf-autotable hängt `lastAutoTable` zur Laufzeit an die jsPDF-Instanz an,
// ist in den Typdefinitionen aber nicht deklariert (dort ist `doc: any`).
interface JsPdfWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number }
}

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

const WEEKDAY_NAMES = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']

function formatDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}.${month}.${year}`
}

function weekdayLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return WEEKDAY_NAMES[new Date(year, month - 1, day).getDay()] ?? ''
}

export function generateYearPdf(data: YearAggregation, userName: string) {
  const doc = new jsPDF() as JsPdfWithAutoTable

  // ── Kopf ────────────────────────────────────────────
  doc.setFontSize(18)
  doc.text(`Arbeitsnachweis ${data.year}`, 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(110)
  doc.text(`${userName} — erstellt am ${new Date().toLocaleDateString('de-DE')}`, 14, 25)
  doc.setTextColor(0)

  // ── Zusammenfassung ─────────────────────────────────
  autoTable(doc, {
    startY: 32,
    head: [['Status', 'Tage']],
    body: STATUS_ORDER.map((status) => [STATUS_META[status].label, String(data.counts[status])]),
    foot: [['Effektive Urlaubstage (inkl. Korrekturen)', String(data.effectiveHolidayDays)]],
    theme: 'grid',
    headStyles: { fillColor: [12, 18, 27] },
    footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
    styles: { fontSize: 10 },
  })

  let cursorY = (doc.lastAutoTable?.finalY ?? 32) + 10

  // ── Zusätzliche Urlaubstage ─────────────────────────
  if (data.adjustments.length > 0) {
    doc.setFontSize(12)
    doc.text('Zusätzliche Urlaubstage', 14, cursorY)
    autoTable(doc, {
      startY: cursorY + 4,
      head: [['Anzahl', 'Grund']],
      body: data.adjustments.map((adjustment) => [
        `${adjustment.amount > 0 ? '+' : ''}${adjustment.amount}`,
        adjustment.reason,
      ]),
      theme: 'striped',
      styles: { fontSize: 10 },
    })
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 10
  }

  // ── Monatsübersicht ─────────────────────────────────
  const monthlyRows = Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
    const monthDays = data.days.filter((day) => Number(day.date.slice(5, 7)) === month)
    const counts = STATUS_ORDER.map(
      (status) => monthDays.filter((day) => day.status === status).length,
    )
    return [MONTH_NAMES[month - 1], ...counts.map(String)]
  })

  doc.setFontSize(12)
  doc.text('Monatsübersicht', 14, cursorY)
  autoTable(doc, {
    startY: cursorY + 4,
    head: [['Monat', ...STATUS_ORDER.map((status) => STATUS_META[status].label)]],
    body: monthlyRows,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [12, 18, 27] },
  })

  // ── Tagesübersicht (Anhang, neue Seite) ──────────────
  doc.addPage()
  doc.setFontSize(14)
  doc.text(`Tagesübersicht ${data.year}`, 14, 18)

  const dayRows = data.days
    .filter((day) => day.status)
    .map((day) => [
      formatDateLabel(day.date),
      weekdayLabel(day.date),
      day.status ? STATUS_META[day.status].label : '',
    ])

  autoTable(doc, {
    startY: 24,
    head: [['Datum', 'Wochentag', 'Status']],
    body: dayRows,
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [12, 18, 27] },
  })

  doc.save(`Arbeitsnachweis-${data.year}.pdf`)
}
