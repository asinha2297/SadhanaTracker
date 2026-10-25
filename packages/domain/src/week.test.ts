import { describe, expect, it } from 'vitest'
import { weekDates, weekRangeOf } from './week'

describe('weekRangeOf', () => {
  it('runs Monday to Sunday around a mid-week date', () => {
    expect(weekRangeOf('2026-10-21')).toEqual({ start: '2026-10-19', end: '2026-10-25' })
  })

  it('treats Monday as the first day and Sunday as the last', () => {
    expect(weekRangeOf('2026-10-19')).toEqual({ start: '2026-10-19', end: '2026-10-25' })
    expect(weekRangeOf('2026-10-25')).toEqual({ start: '2026-10-19', end: '2026-10-25' })
  })

  it('spans month and year boundaries', () => {
    expect(weekRangeOf('2026-11-01')).toEqual({ start: '2026-10-26', end: '2026-11-01' })
    expect(weekRangeOf('2027-01-01')).toEqual({ start: '2026-12-28', end: '2027-01-03' })
  })
})

describe('weekDates', () => {
  it('lists the seven dates of the week containing the given date', () => {
    expect(weekDates('2026-10-24')).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
  })
})
