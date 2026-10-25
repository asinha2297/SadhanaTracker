import type { LocalDate } from './localDate'

export function idempotencyKey(userId: string, localDate: LocalDate, clientUpdatedAt: string): string {
  return `${userId}_${localDate}_${clientUpdatedAt}`
}
