// Typen für das Tool "Trainingsplan"

// Trainingsbereich pro Nutzer. key ist stabil und wird in Übungen gespeichert;
// name und icon sind frei änderbar.
export interface FocusArea {
  id: string
  key: string
  name: string
  icon: string
  sortOrder: number
  usageCount: number
}

// Deckt gewichtsbasiertes Krafttraining (kg/g), zeit-/distanzbasiertes
// Cardio (s/min/h/km/m) und reine Wiederholungsübungen ohne Gewicht
// (BODYWEIGHT, z.B. Klimmzüge) ab. Eine Übung hat eine Haupteinheit (unit)
// und optional eine zweite (secondaryUnit, z.B. Laufen = km + min).
export type ExerciseUnit = 'KG' | 'G' | 'S' | 'MIN' | 'H' | 'KM' | 'M' | 'BODYWEIGHT'

export interface ExerciseInfoSection {
  title: string
  text: string
  imageUrl: string | null
}

export interface Exercise {
  id: string
  name: string
  focusAreas: string[]
  unit: ExerciseUnit
  secondaryUnit: ExerciseUnit | null
  imageUrl: string | null
  infoSections: ExerciseInfoSection[]
  isArchived: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
}

export interface ExerciseInput {
  name: string
  focusAreas: string[]
  unit: ExerciseUnit
  secondaryUnit?: ExerciseUnit | null
  infoSections?: ExerciseInfoSection[]
  archived?: boolean
}

export interface ExerciseHistorySet {
  order: number
  value: number | null
  reps: number | null
  secondaryValue: number | null
}

export interface ExerciseHistoryEntry {
  sessionId: string
  performedAt: string
  sessionExerciseId: string
  sets: ExerciseHistorySet[]
}

export interface SessionListItem {
  id: string
  performedAt: string
  note: string | null
  exerciseCount: number
  createdAt: string
}

export interface SessionExerciseSet {
  id: string
  order: number
  value: number | null
  reps: number | null
  secondaryValue: number | null
}

export interface SessionExerciseEntry {
  id: string
  order: number
  exercise: {
    id: string
    name: string
    unit: ExerciseUnit
    secondaryUnit: ExerciseUnit | null
    imageUrl: string | null
    focusAreas: string[]
    isArchived: boolean
  }
  sets: SessionExerciseSet[]
}

export interface TrainingSession {
  id: string
  performedAt: string
  note: string | null
  exercises: SessionExerciseEntry[]
  createdAt: string
  updatedAt: string
}

export interface SetInput {
  value: number | null
  reps: number | null
  secondaryValue?: number | null
}
