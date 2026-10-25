import type { LocalDate } from '@sadhana/domain'

export const todayIn = (timeZone: string, now = new Date()): LocalDate =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
