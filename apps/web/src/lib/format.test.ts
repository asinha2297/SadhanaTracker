import { describe, expect, it } from 'vitest'
import { firstName, longDate, minutesLabel, monthBounds, shiftMonth, shortDate, totalsLine, weekLabel, weekdayShort } from './format'

describe('weekLabel', () => {
  it('collapses the month when the week stays inside it and spells both otherwise', () => {
    expect(weekLabel('2026-10-19', '2026-10-25')).toBe('19 – 25 October 2026')
    expect(weekLabel('2026-10-26', '2026-11-01')).toBe('26 October – 1 November 2026')
  })
})

describe('months', () => {
  it('finds the bounds of a month and steps across years', () => {
    expect(monthBounds('2026-02')).toEqual(['2026-02-01', '2026-02-28'])
    expect(monthBounds('2028-02')).toEqual(['2028-02-01', '2028-02-29'])
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })
})

describe('totalsLine', () => {
  it('reads as one sentence', () => {
    expect(totalsLine({ rounds: 16, readingMinutes: 75, hearingMinutes: 0 })).toBe('16 rounds · 1 h 15 min reading · 0 min hearing')
  })
})

describe('date labels', () => {
  it('format a local date without shifting it across time zones', () => {
    expect(longDate('2026-10-24')).toMatch(/Saturday,? 24 October/)
    expect(shortDate('2026-01-01')).toBe('1 Jan')
    expect(weekdayShort('2026-10-19')).toBe('Mon')
  })
})

describe('minutesLabel', () => {
  it('reads naturally below and above an hour', () => {
    expect(minutesLabel(45)).toBe('45 min')
    expect(minutesLabel(60)).toBe('1 h')
    expect(minutesLabel(75)).toBe('1 h 15 min')
  })
})

describe('firstName', () => {
  it('takes the first word of a devotional name', () => {
    expect(firstName('Rādhikā Devī Dāsī')).toBe('Rādhikā')
    expect(firstName('Govinda')).toBe('Govinda')
  })
})
