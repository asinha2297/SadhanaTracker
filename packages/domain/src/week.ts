import { addDays, dayOfWeek, type LocalDate } from './localDate'

const WEEK_STARTS_ON = 1

export interface WeekRange {
  start: LocalDate
  end: LocalDate
}

export function weekRangeOf(localDate: LocalDate): WeekRange {
  const start = addDays(localDate, -((dayOfWeek(localDate) - WEEK_STARTS_ON + 7) % 7))
  return { start, end: addDays(start, 6) }
}

export function weekDates(localDate: LocalDate): LocalDate[] {
  const { start } = weekRangeOf(localDate)
  return Array.from({ length: 7 }, (_, offset) => addDays(start, offset))
}
