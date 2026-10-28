import type { LocalDate, Target } from '@sadhana/domain'
import { useMemo } from 'react'
import { LANGUAGES, useLanguage, type Language } from './index'

/** Dates, numbers and totals in the language's own words and digits. Local dates are formatted in UTC so they never shift. */
export function createFormatters(language: Language) {
  const { locale, dictionary: t } = LANGUAGES[language]
  const day = (localDate: LocalDate, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(new Date(`${localDate}T00:00:00Z`))
  const number = (value: number) => new Intl.NumberFormat(locale, { useGrouping: false }).format(value)
  const minutes = (total: number) => {
    if (total < 60) return t.format.minutes(number(total))
    const rest = total % 60
    return rest ? t.format.hoursMinutes(number(Math.floor(total / 60)), number(rest)) : t.format.hours(number(total / 60))
  }
  return {
    number,
    percent: (value: number) => `${number(value)}%`,
    longDate: (date: LocalDate) => day(date, { weekday: 'long', day: 'numeric', month: 'long' }),
    shortDate: (date: LocalDate) => day(date, { day: 'numeric', month: 'short' }),
    weekdayShort: (date: LocalDate) => day(date, { weekday: 'short' }),
    monthLabel: (date: LocalDate) => day(date, { month: 'long', year: 'numeric' }),
    weekLabel: (start: LocalDate, end: LocalDate) => {
      const sameMonth = start.slice(0, 7) === end.slice(0, 7)
      const from = day(start, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'long' })
      return `${from} – ${day(end, { day: 'numeric', month: 'long', year: 'numeric' })}`
    },
    minutes,
    totals: (totals: Target) => t.format.totals(number(totals.rounds), minutes(totals.readingMinutes), minutes(totals.hearingMinutes)),
    instant: (iso: string) =>
      new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)),
    time: (iso: string) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)),
  }
}

export type Formatters = ReturnType<typeof createFormatters>

export function useFormat(): Formatters {
  const { language } = useLanguage()
  return useMemo(() => createFormatters(language), [language])
}
