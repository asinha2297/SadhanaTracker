import { daysBetween, type LocalDate } from './localDate'

export const EDIT_WINDOW_DAYS = 7

export function isEditable(localDate: LocalDate, today: LocalDate): boolean {
  const age = daysBetween(localDate, today)
  return age >= 0 && age < EDIT_WINDOW_DAYS
}
