import { describe, expect, it } from 'vitest'
import { firstName, monthBounds, shiftMonth } from './format'

describe('months', () => {
  it('finds the bounds of a month and steps across years', () => {
    expect(monthBounds('2026-02')).toEqual(['2026-02-01', '2026-02-28'])
    expect(monthBounds('2028-02')).toEqual(['2028-02-01', '2028-02-29'])
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })
})

describe('firstName', () => {
  it('takes the first word of a devotional name', () => {
    expect(firstName('Rādhikā Devī Dāsī')).toBe('Rādhikā')
    expect(firstName('Govinda')).toBe('Govinda')
  })
})
