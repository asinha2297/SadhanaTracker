import type { Target } from './schemas'
import type { Totals } from './totals'

export type Completion = Record<keyof Totals, number>

export function completionPercent(actual: number, target: number): number {
  return target === 0 ? 100 : Math.round((actual / target) * 100)
}

export function targetCompletion(totals: Totals, target: Target): Completion {
  return {
    rounds: completionPercent(totals.rounds, target.rounds),
    readingMinutes: completionPercent(totals.readingMinutes, target.readingMinutes),
    hearingMinutes: completionPercent(totals.hearingMinutes, target.hearingMinutes),
  }
}

export function meetsTarget(totals: Totals, target: Target): boolean {
  return (
    totals.rounds >= target.rounds &&
    totals.readingMinutes >= target.readingMinutes &&
    totals.hearingMinutes >= target.hearingMinutes
  )
}
