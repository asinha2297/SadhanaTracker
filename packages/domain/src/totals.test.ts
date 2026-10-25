import { describe, expect, it } from 'vitest'
import { entry } from '../test/fixtures'
import { dailyTotals, sumTotals } from './totals'

describe('dailyTotals', () => {
  it('sums reading and hearing sessions and carries rounds through', () => {
    expect(dailyTotals(entry('2026-10-24', { rounds: 16, reading: [15, 20], hearing: [40] }))).toEqual({
      rounds: 16,
      readingMinutes: 35,
      hearingMinutes: 40,
    })
  })

  it('is all zeros for a zero-value entry', () => {
    expect(dailyTotals(entry('2026-10-24'))).toEqual({ rounds: 0, readingMinutes: 0, hearingMinutes: 0 })
  })
})

describe('sumTotals', () => {
  it('adds up every entry it is given', () => {
    expect(
      sumTotals([
        entry('2026-10-19', { rounds: 16, reading: [30], hearing: [30] }),
        entry('2026-10-20', { rounds: 8, reading: [10, 5] }),
        entry('2026-10-21'),
      ]),
    ).toEqual({ rounds: 24, readingMinutes: 45, hearingMinutes: 30 })
  })

  it('is all zeros for no entries', () => {
    expect(sumTotals([])).toEqual({ rounds: 0, readingMinutes: 0, hearingMinutes: 0 })
  })
})
