import type { CSSProperties } from 'react'
import type { WorkDayStatus } from '@app-types/homeoffice'

export interface ChipStyle extends CSSProperties {
  '--chip-color'?: string
}

export const STATUS_ORDER: WorkDayStatus[] = [
  'OFFICE',
  'HOME_OFFICE',
  'HOLIDAY',
  'PUBLIC_HOLIDAY',
  'SICK',
]

export const STATUS_META: Record<WorkDayStatus, { label: string; icon: string; colorVar: string }> = {
  OFFICE: { label: 'Büro', icon: '🏢', colorVar: '--chart-office' },
  HOME_OFFICE: { label: 'HomeOffice', icon: '🏠', colorVar: '--chart-home-office' },
  HOLIDAY: { label: 'Urlaub', icon: '🏖️', colorVar: '--chart-holiday' },
  PUBLIC_HOLIDAY: { label: 'Feiertag', icon: '🎉', colorVar: '--chart-public-holiday' },
  SICK: { label: 'Krank', icon: '🤒', colorVar: '--chart-sick' },
}

export function chipStyle(status: WorkDayStatus): ChipStyle {
  return { '--chip-color': `var(${STATUS_META[status].colorVar})` }
}
