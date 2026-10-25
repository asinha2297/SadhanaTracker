import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, isLocalDate } from './localDate'

describe('isLocalDate', () => {
  it('accepts real calendar dates, including leap day', () => {
    expect(isLocalDate('2026-10-24')).toBe(true)
    expect(isLocalDate('2028-02-29')).toBe(true)
  })

  it('rejects dates that do not exist', () => {
    expect(isLocalDate('2027-02-29')).toBe(false)
    expect(isLocalDate('2026-04-31')).toBe(false)
    expect(isLocalDate('2026-13-01')).toBe(false)
    expect(isLocalDate('2026-00-10')).toBe(false)
  })

  it('rejects anything that is not YYYY-MM-DD', () => {
    expect(isLocalDate('24/10/2026')).toBe(false)
    expect(isLocalDate('2026-10-24T00:00:00Z')).toBe(false)
    expect(isLocalDate('')).toBe(false)
  })
})

describe('addDays', () => {
  it('crosses month, leap-day and year boundaries in both directions', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
    expect(addDays('2026-10-24', 0)).toBe('2026-10-24')
  })
})

describe('daysBetween', () => {
  it('counts whole days from the first date to the second, signed', () => {
    expect(daysBetween('2026-10-20', '2026-10-24')).toBe(4)
    expect(daysBetween('2026-10-24', '2026-10-20')).toBe(-4)
    expect(daysBetween('2026-10-24', '2026-10-24')).toBe(0)
    expect(daysBetween('2026-12-28', '2027-01-03')).toBe(6)
  })
})
