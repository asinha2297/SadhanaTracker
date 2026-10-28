import { describe, expect, it } from 'vitest'
import { createFormatters } from './format'

const en = createFormatters('en')

describe('createFormatters', () => {
  it('collapses the month when the week stays inside it and spells both otherwise', () => {
    expect(en.weekLabel('2026-10-19', '2026-10-25')).toBe('19 – 25 October 2026')
    expect(en.weekLabel('2026-10-26', '2026-11-01')).toBe('26 October – 1 November 2026')
  })

  it('reads totals as one sentence', () => {
    expect(en.totals({ rounds: 16, readingMinutes: 75, hearingMinutes: 0 })).toBe('16 rounds · 1 h 15 min reading · 0 min hearing')
  })

  it('formats a local date without shifting it across time zones', () => {
    expect(en.longDate('2026-10-24')).toMatch(/Saturday,? 24 October/)
    expect(en.shortDate('2026-01-01')).toBe('1 Jan')
    expect(en.weekdayShort('2026-10-19')).toBe('Mon')
  })

  it('reads minutes naturally below and above an hour', () => {
    expect(en.minutes(45)).toBe('45 min')
    expect(en.minutes(60)).toBe('1 h')
    expect(en.minutes(75)).toBe('1 h 15 min')
  })

  it('speaks Hindi month names and Bangla digits', () => {
    expect(createFormatters('hi').monthLabel('2026-10-01')).toBe('अक्टूबर 2026')
    const bn = createFormatters('bn')
    expect(bn.number(16)).toBe('১৬')
    expect(bn.percent(75)).toBe('৭৫%')
    expect(bn.weekdayShort('2026-10-19')).toBe('সোম')
  })
})
