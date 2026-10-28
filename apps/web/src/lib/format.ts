import { addDays, type LocalDate } from '@sadhana/domain'

const monthStart = (month: string, delta: number) =>
  new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + delta, 1)).toISOString()

export const shiftMonth = (month: string, delta: number): string => monthStart(month, delta).slice(0, 7)

export const monthBounds = (month: string): [LocalDate, LocalDate] => [
  `${month}-01`,
  addDays(monthStart(month, 1).slice(0, 10), -1),
]

export const firstName = (name: string): string => name.split(' ')[0] ?? name
