import type { LocalDate } from '@sadhana/domain'

const pad = (value: number) => String(value).padStart(2, '0')

export function localDateOf(date: Date): LocalDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const todayLocalDate = (): LocalDate => localDateOf(new Date())

export function localTimeIn(timeZone: string, date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date)
}

export const deviceTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone
