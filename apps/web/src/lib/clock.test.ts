import { describe, expect, it } from 'vitest'
import { localDateOf, localTimeIn } from './clock'

describe('localDateOf', () => {
  it('uses the device-local calendar date', () => {
    expect(localDateOf(new Date(2026, 9, 24, 23, 59))).toBe('2026-10-24')
    expect(localDateOf(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01')
  })
})

describe('localTimeIn', () => {
  it('gives HH:MM in the requested time zone', () => {
    expect(localTimeIn('Asia/Kolkata', new Date('2026-10-24T15:30:00Z'))).toBe('21:00')
    expect(localTimeIn('UTC', new Date('2026-10-24T00:05:00Z'))).toBe('00:05')
  })
})
