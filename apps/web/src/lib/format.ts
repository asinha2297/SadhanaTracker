import { addDays, type LocalDate, type Target } from '@sadhana/domain'

const formatDay = (localDate: LocalDate, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options }).format(new Date(`${localDate}T00:00:00Z`))

export const longDate = (localDate: LocalDate) =>
  formatDay(localDate, { weekday: 'long', day: 'numeric', month: 'long' })

export const shortDate = (localDate: LocalDate) => formatDay(localDate, { day: 'numeric', month: 'short' })

export const weekdayShort = (localDate: LocalDate) => formatDay(localDate, { weekday: 'short' })

export const monthLabel = (localDate: LocalDate) => formatDay(localDate, { month: 'long', year: 'numeric' })

export function weekLabel(start: LocalDate, end: LocalDate): string {
  const sameMonth = start.slice(0, 7) === end.slice(0, 7)
  const from = formatDay(start, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'long' })
  return `${from} – ${formatDay(end, { day: 'numeric', month: 'long', year: 'numeric' })}`
}

const monthStart = (month: string, delta: number) =>
  new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + delta, 1)).toISOString()

export const shiftMonth = (month: string, delta: number): string => monthStart(month, delta).slice(0, 7)

export const monthBounds = (month: string): [LocalDate, LocalDate] => [
  `${month}-01`,
  addDays(monthStart(month, 1).slice(0, 10), -1),
]

export function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const rest = minutes % 60
  return rest ? `${Math.floor(minutes / 60)} h ${rest} min` : `${minutes / 60} h`
}

export const totalsLine = (totals: Target): string =>
  `${totals.rounds} rounds · ${minutesLabel(totals.readingMinutes)} reading · ${minutesLabel(totals.hearingMinutes)} hearing`

export const firstName = (name: string): string => name.split(' ')[0] ?? name

export const instantLabel = (iso: string): string =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
