import { dayStatus } from './dayStatus'
import { addDays, type LocalDate } from './localDate'
import type { DailyEntry } from './schemas'

export function streak(entries: DailyEntry[], today: LocalDate): number {
  const practiced = new Set(
    entries.filter((entry) => dayStatus(entry) === 'RECORDED').map((entry) => entry.localDate),
  )
  let date = practiced.has(today) ? today : addDays(today, -1)
  let count = 0
  while (practiced.has(date)) {
    count += 1
    date = addDays(date, -1)
  }
  return count
}
