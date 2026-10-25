import { describe, expect, it } from 'vitest'
import { entry } from '../test/fixtures'
import { dayStatus } from './dayStatus'

describe('dayStatus', () => {
  it('is MISSING when no record was submitted', () => {
    expect(dayStatus(undefined)).toBe('MISSING')
  })

  it('is ZERO_ENTRY for a submitted record with no practice, even with a reflection', () => {
    expect(dayStatus(entry('2026-10-24'))).toBe('ZERO_ENTRY')
    expect(dayStatus(entry('2026-10-24', { reflection: 'Travelling today.' }))).toBe('ZERO_ENTRY')
  })

  it('is RECORDED when any rounds, reading or hearing were logged', () => {
    expect(dayStatus(entry('2026-10-24', { rounds: 1 }))).toBe('RECORDED')
    expect(dayStatus(entry('2026-10-24', { reading: [5] }))).toBe('RECORDED')
    expect(dayStatus(entry('2026-10-24', { hearing: [5] }))).toBe('RECORDED')
  })
})
