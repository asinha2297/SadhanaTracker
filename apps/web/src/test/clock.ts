import { afterEach, beforeEach, vi } from 'vitest'

export const SATURDAY_EVENING = new Date(2026, 9, 24, 20, 0)

export function freezeTime(date: Date) {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(date)
  })
  afterEach(() => vi.useRealTimers())
}
