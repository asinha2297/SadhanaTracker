import type { DailyEntry } from './schemas'
import { dailyTotals } from './totals'

export type DayStatus = 'MISSING' | 'ZERO_ENTRY' | 'RECORDED'

export function dayStatus(entry: DailyEntry | undefined): DayStatus {
  if (!entry) return 'MISSING'
  const { rounds, readingMinutes, hearingMinutes } = dailyTotals(entry)
  return rounds === 0 && readingMinutes === 0 && hearingMinutes === 0 ? 'ZERO_ENTRY' : 'RECORDED'
}
