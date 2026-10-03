// Formatierungs-/Statistik-Helfer für das Tool "Trainingsplan"
import type { ExerciseUnit, SessionListItem } from '@app-types/trainingsplan'

export const UNIT_META: Record<ExerciseUnit, { label: string }> = {
  KG: { label: 'kg' },
  G: { label: 'g' },
  S: { label: 's' },
  MIN: { label: 'min' },
  H: { label: 'h' },
  KM: { label: 'km' },
  M: { label: 'm' },
  BODYWEIGHT: { label: 'Körpergewicht' },
}

export const EXERCISE_UNITS: ExerciseUnit[] = ['KG', 'G', 'S', 'MIN', 'H', 'KM', 'M', 'BODYWEIGHT']

// Gewichtsbasierte Einheiten — nur für diese ergeben Volumen/1RM fachlich
// Sinn (Zeit/Distanz-Cardio und Körpergewicht haben kein sinnvolles
// "1 Repetition Maximum").
export function isWeightUnit(unit: ExerciseUnit): boolean {
  return unit === 'KG' || unit === 'G'
}

// Ein Satz als lesbarer Text: Wiederholungen VOR dem Wert ("8 × 70 kg" statt
// "70 kg × 8") — bewusst so gewählt, siehe Nutzer-Feedback zur Lesbarkeit der
// Satz-Liste. Bei Körpergewicht-Übungen (value === null) nur die
// Wiederholungen, bei reinem Distanz-/Zeit-Cardio ohne Wiederholungen nur
// der Wert. Optionaler Sekundärwert (zweite Einheit, z.B. Laufzeit neben
// Distanz) wird angehängt, wenn die Übung eine secondaryUnit hat.
export function formatSetValue(
  set: { value: number | null; reps: number | null; secondaryValue?: number | null },
  unit: ExerciseUnit,
  secondaryUnit?: ExerciseUnit | null,
): string {
  const parts: string[] = []
  if (set.reps !== null && set.value !== null) {
    parts.push(`${set.reps} × ${set.value} ${UNIT_META[unit].label}`)
  } else if (set.reps !== null) {
    parts.push(`${set.reps} Wdh.`)
  } else if (set.value !== null) {
    parts.push(`${set.value} ${UNIT_META[unit].label}`)
  }
  if (secondaryUnit && set.secondaryValue !== null && set.secondaryValue !== undefined) {
    parts.push(`${set.secondaryValue} ${UNIT_META[secondaryUnit].label}`)
  }
  return parts.length > 0 ? parts.join(' · ') : '–'
}

// Epley-Formel — gängige Schätzung des 1-Repetition-Maximums aus Gewicht und
// Wiederholungen einer nicht-maximalen Runde.
export function estimate1RM(value: number, reps: number): number {
  if (reps <= 0) return value
  return value * (1 + reps / 30)
}

export function computeSetVolume(value: number | null, reps: number | null): number {
  if (value === null || reps === null) return 0
  return value * reps
}

// ── Häufigkeit/Streak (client-seitig aus der rohen Sessions-Liste
//    berechnet, Muster wie getCompleteness/incompleteCount im Kochbuch) ────

// WICHTIG: lokale Datums-Getter statt toISOString()/UTC — eine um 00:30 Uhr
// lokal geloggte Einheit ist lokal "heute", kann aber auf den UTC-Vortag
// fallen und Wochen-/Streak-Bucketing sonst lautlos falsch machen (gleicher
// Grundsatz wie der @db.Date-Pitfall in CLAUDE.md, hier auf Frontend-Ebene).

// Montag als Wochenstart (ISO), damit jede Woche eindeutig einem Schlüssel
// zugeordnet ist.
function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = result.getDay() // 0 = Sonntag
  const diffToMonday = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diffToMonday)
  return result
}

export function weekKey(date: Date): string {
  const start = startOfWeek(date)
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
}

// Streak = aufeinanderfolgende Wochen mit mindestens einer Einheit (nicht
// Tage — bei realistischem Trainingsrhythmus, nicht täglich, wäre eine
// Tage-Streak ständig bei 1 bzw. würde an jedem Ruhetag abreißen).
export function computeWeekStreak(sessions: SessionListItem[]): number {
  if (sessions.length === 0) return 0

  const weeksWithSession = new Set(sessions.map((s) => weekKey(new Date(s.performedAt))))

  let streak = 0
  const cursor = startOfWeek(new Date())
  while (weeksWithSession.has(weekKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

export interface TrainingFrequencyBucket {
  weekStart: string // YYYY-MM-DD, lokal
  count: number
}

// Einheiten pro Woche für die letzten `weeks` Wochen (inkl. aktueller Woche),
// älteste zuerst — für einen einfachen Balken-Chart auf der Übersicht.
export function computeWeeklyFrequency(sessions: SessionListItem[], weeks = 12): TrainingFrequencyBucket[] {
  const counts = new Map<string, number>()
  for (const session of sessions) {
    const key = weekKey(new Date(session.performedAt))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const buckets: TrainingFrequencyBucket[] = []
  const cursor = startOfWeek(new Date())
  for (let i = 0; i < weeks; i++) {
    const key = weekKey(cursor)
    buckets.unshift({ weekStart: key, count: counts.get(key) ?? 0 })
    cursor.setDate(cursor.getDate() - 7)
  }
  return buckets
}

export interface SessionWeekGroup {
  key: string
  weekNumber: number
  sessions: SessionListItem[]
}

// Gruppiert eine Sessions-Liste nach Kalenderwoche, für Trennlinien zwischen
// KWs in der Anzeige (siehe Uebersicht.tsx "Letzte Einheiten") — erwartet
// die Sessions bereits sortiert (z.B. neueste zuerst) und bildet
// aufeinanderfolgende gleiche Wochen zu einer Gruppe, ohne die Reihenfolge
// zu verändern.
export function groupSessionsByWeek(sessions: SessionListItem[]): SessionWeekGroup[] {
  const groups: SessionWeekGroup[] = []
  for (const session of sessions) {
    const date = new Date(session.performedAt)
    const key = weekKey(date)
    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.sessions.push(session)
    } else {
      groups.push({ key, weekNumber: isoWeekNumber(date), sessions: [session] })
    }
  }
  return groups
}

const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

// ISO-8601-Kalenderwoche (Woche mit dem ersten Donnerstag des Jahres = KW 1).
// Rechnet mit den lokalen Kalender-Komponenten (getFullYear/Month/Date), aber
// in einem UTC-verankerten Date für die reine Tages-Arithmetik — vermeidet
// DST-Verschiebungen, ohne den lokale-vs-UTC-Bucketing-Pitfall (CLAUDE.md)
// zu wiederholen.
export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function weekdayDatePart(date: Date): string {
  const datePart = date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${WEEKDAY_LABELS[date.getDay()]}, ${datePart}`
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return `${weekdayDatePart(date)} · KW ${isoWeekNumber(date)}`
}

// Wie formatDateTime, aber ohne "· KW xx" — für Listen, in denen die KW
// bereits separat als Gruppen-Überschrift/Trennlinie steht (siehe
// groupSessionsByWeek, genutzt in Uebersicht.tsx "Letzte Einheiten").
export function formatWeekdayDateTime(iso: string): string {
  return weekdayDatePart(new Date(iso))
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  const datePart = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${WEEKDAY_LABELS[date.getDay()]}, ${datePart}`
}

// Nur Wochentag ("Sa") für kompakte Listen, z.B. neben dem Datum.
export function formatWeekdayShort(iso: string): string {
  return WEEKDAY_LABELS[new Date(iso).getDay()]
}

// Kompaktes "TT.MM." für Achsenbeschriftungen im Verlaufs-Chart — formatDate
// (mit Wochentag + Jahr) wäre dort zu lang und würde Labels kollidieren lassen.
export function formatShortDate(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.`
}

// Für <input type="datetime-local">, das lokale Zeit ohne Zeitzonen-Suffix
// im Format "YYYY-MM-DDTHH:mm" erwartet.
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Filter für den Übungskatalog und die Übungsauswahl: Schwerpunkte ODER-
// verknüpft (eine Übung passt bei einem der gewählten Bereiche), Gerät
// einfach. EQUIPMENT_ALL = kein Gerätefilter, NO_EQUIPMENT = nur freie Übungen.
export const EQUIPMENT_ALL = ''
export const NO_EQUIPMENT = '__ohne__'

export function matchesExerciseFilter(
  exercise: { focusAreas: string[]; equipmentKey: string | null },
  focusFilter: string[],
  equipmentFilter: string,
): boolean {
  if (focusFilter.length > 0 && !exercise.focusAreas.some((focus) => focusFilter.includes(focus))) return false
  if (equipmentFilter === NO_EQUIPMENT) return exercise.equipmentKey === null
  if (equipmentFilter !== EQUIPMENT_ALL) return exercise.equipmentKey === equipmentFilter
  return true
}
