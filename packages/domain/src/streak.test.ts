import { describe, expect, it } from 'vitest'
import { entry } from '../test/fixtures'
import { streak } from './streak'

const today = '2026-10-24'
const practiced = (localDate: string) => entry(localDate, { rounds: 16 })

describe('streak', () => {
  it('is 0 with no entries', () => {
    expect(streak([], today)).toBe(0)
  })

  it('counts consecutive practiced days ending today', () => {
    expect(streak([practiced('2026-10-22'), practiced('2026-10-23'), practiced(today)], today)).toBe(3)
  })

  it('does not break while today is still unrecorded', () => {
    expect(streak([practiced('2026-10-22'), practiced('2026-10-23')], today)).toBe(2)
  })

  it('is 0 once yesterday was missed and today is unrecorded', () => {
    expect(streak([practiced('2026-10-21'), practiced('2026-10-22')], today)).toBe(0)
  })

  it('stops at a gap or a zero-value day', () => {
    expect(streak([practiced('2026-10-21'), practiced('2026-10-23'), practiced(today)], today)).toBe(2)
    expect(streak([practiced('2026-10-22'), entry('2026-10-23'), practiced(today)], today)).toBe(1)
  })
})
