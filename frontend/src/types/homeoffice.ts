// Typen für das Tool "Arbeitsnachweis"

export type WorkDayStatus = 'OFFICE' | 'HOME_OFFICE' | 'HOLIDAY' | 'PUBLIC_HOLIDAY' | 'SICK'

export type Bundesland =
  | 'BW'
  | 'BY'
  | 'BE'
  | 'BB'
  | 'HB'
  | 'HH'
  | 'HE'
  | 'MV'
  | 'NI'
  | 'NW'
  | 'RP'
  | 'SL'
  | 'SN'
  | 'ST'
  | 'SH'
  | 'TH'

export interface ResolvedDay {
  date: string
  status: WorkDayStatus | null
  isAutoHoliday: boolean
}

export interface MonthResponse {
  monthStart: string
  monthEnd: string
  days: ResolvedDay[]
}

export interface VacationAdjustment {
  id: string
  userId: string
  year: number
  amount: number
  reason: string
  createdAt: string
}

export interface YearAggregation {
  year: number
  counts: Record<WorkDayStatus, number>
  totalWorkdays: number
  adjustments: VacationAdjustment[]
  adjustmentTotal: number
  effectiveHolidayDays: number
  days: ResolvedDay[]
}

export interface FederalStateEntry {
  id: string
  state: Bundesland
  validFrom: string
}
