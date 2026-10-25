export type LocalDate = string

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/
const MS_PER_DAY = 86_400_000

function toUtcMs(localDate: LocalDate): number {
  const date = new Date(0)
  date.setUTCFullYear(Number(localDate.slice(0, 4)), Number(localDate.slice(5, 7)) - 1, Number(localDate.slice(8, 10)))
  return date.getTime()
}

function fromUtcMs(utcMs: number): LocalDate {
  return new Date(utcMs).toISOString().slice(0, 10)
}

export function isLocalDate(value: string): boolean {
  return LOCAL_DATE.test(value) && fromUtcMs(toUtcMs(value)) === value
}

export function addDays(localDate: LocalDate, days: number): LocalDate {
  return fromUtcMs(toUtcMs(localDate) + days * MS_PER_DAY)
}

export function daysBetween(from: LocalDate, to: LocalDate): number {
  return (toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY
}

export function dayOfWeek(localDate: LocalDate): number {
  return new Date(toUtcMs(localDate)).getUTCDay()
}
