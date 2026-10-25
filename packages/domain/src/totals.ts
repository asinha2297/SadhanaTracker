import type { DailyEntry } from './schemas'

export interface Totals {
  rounds: number
  readingMinutes: number
  hearingMinutes: number
}

const ZERO: Totals = { rounds: 0, readingMinutes: 0, hearingMinutes: 0 }

const minutesOf = (sessions: { minutes: number }[]): number =>
  sessions.reduce((sum, session) => sum + session.minutes, 0)

export function dailyTotals(entry: DailyEntry): Totals {
  return {
    rounds: entry.rounds,
    readingMinutes: minutesOf(entry.reading),
    hearingMinutes: minutesOf(entry.hearing),
  }
}

export function sumTotals(entries: DailyEntry[]): Totals {
  return entries.map(dailyTotals).reduce(
    (sum, day) => ({
      rounds: sum.rounds + day.rounds,
      readingMinutes: sum.readingMinutes + day.readingMinutes,
      hearingMinutes: sum.hearingMinutes + day.hearingMinutes,
    }),
    ZERO,
  )
}
