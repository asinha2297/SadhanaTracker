import { dayOfWeek, type LocalDate } from '@sadhana/domain'
import type { Dictionary } from '../i18n/en'

export interface Verse {
  text: string
  source: string
}

/** One verse per weekday, in the current language. */
export const verseFor = (t: Dictionary, localDate: LocalDate): Verse => t.verses[dayOfWeek(localDate)] as Verse
