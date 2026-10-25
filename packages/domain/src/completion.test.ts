import { describe, expect, it } from 'vitest'
import { completionPercent, meetsTarget, targetCompletion } from './completion'

const target = { rounds: 16, readingMinutes: 30, hearingMinutes: 30 }

describe('completionPercent', () => {
  it('rounds to a whole percent and is not capped at 100', () => {
    expect(completionPercent(8, 16)).toBe(50)
    expect(completionPercent(15, 16)).toBe(94)
    expect(completionPercent(18, 16)).toBe(113)
    expect(completionPercent(0, 16)).toBe(0)
  })

  it('treats a zero target as already met', () => {
    expect(completionPercent(0, 0)).toBe(100)
    expect(completionPercent(5, 0)).toBe(100)
  })
})

describe('targetCompletion', () => {
  it('reports each practice against its own target', () => {
    expect(targetCompletion({ rounds: 16, readingMinutes: 15, hearingMinutes: 45 }, target)).toEqual({
      rounds: 100,
      readingMinutes: 50,
      hearingMinutes: 150,
    })
  })
})

describe('meetsTarget', () => {
  it('requires every practice to reach its target', () => {
    expect(meetsTarget({ rounds: 16, readingMinutes: 30, hearingMinutes: 30 }, target)).toBe(true)
    expect(meetsTarget({ rounds: 20, readingMinutes: 60, hearingMinutes: 29 }, target)).toBe(false)
  })
})
