declare module 'date-holidays' {
  export interface Holiday {
    date: string
    start: Date
    end: Date
    name: string
    type: 'public' | 'bank' | 'school' | 'optional' | 'observance'
    substitute?: boolean
  }

  export default class Holidays {
    constructor(country?: string, state?: string, region?: string)
    init(country: string, state?: string, region?: string): void
    getHolidays(year: number): Holiday[]
    isHoliday(date: Date): Holiday[] | false
  }
}
