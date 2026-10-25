import type { LocalDate } from '../src/localDate'
import type { DailyEntry } from '../src/schemas'

interface Practice {
  rounds?: number
  reading?: number[]
  hearing?: number[]
  reflection?: string
}

export function entry(
  localDate: LocalDate,
  { rounds = 0, reading = [], hearing = [], reflection }: Practice = {},
): DailyEntry {
  return {
    localDate,
    rounds,
    reflection,
    reading: reading.map((minutes) => ({ bookTitle: 'Śrīmad-Bhāgavatam', minutes })),
    hearing: hearing.map((minutes) => ({ lectureTitle: 'Bhagavad-gītā class', minutes })),
  }
}
