import { describe, expect, it } from 'vitest'
import {
  DailyEntrySchema,
  HearingSessionSchema,
  ReadingSessionSchema,
  RoleSchema,
  TargetChoiceSchema,
  TargetSchema,
} from './schemas'

describe('RoleSchema', () => {
  it('accepts only the three congregation roles', () => {
    expect(RoleSchema.safeParse('COORDINATOR').success).toBe(true)
    expect(RoleSchema.safeParse('SUPERUSER').success).toBe(false)
  })
})

describe('ReadingSessionSchema', () => {
  it('requires a book from the library and a positive whole number of minutes', () => {
    expect(ReadingSessionSchema.safeParse({ bookId: 3, minutes: 30 }).success).toBe(true)
    for (const bookId of [undefined, Number.NaN, 0, -1, 1.5, 'Bhagavad-gītā As It Is']) {
      const result = ReadingSessionSchema.safeParse({ bookId, minutes: 30 })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe('Choose a book from the library')
    }
    for (const minutes of [0, -5, 1.5]) {
      expect(ReadingSessionSchema.safeParse({ bookId: 3, minutes }).success).toBe(false)
    }
  })

  it('trims the chapter and drops it when blank', () => {
    expect(ReadingSessionSchema.parse({ bookId: 2, chapterOrSection: ' Canto 1 ', minutes: 20 })).toEqual({
      bookId: 2,
      chapterOrSection: 'Canto 1',
      minutes: 20,
    })
    expect(ReadingSessionSchema.parse({ bookId: 2, chapterOrSection: '  ', minutes: 20 })).toEqual({ bookId: 2, minutes: 20 })
  })
})

describe('HearingSessionSchema', () => {
  it('requires a lecture from the library and positive minutes', () => {
    expect(HearingSessionSchema.safeParse({ lectureId: 1, minutes: 45 }).success).toBe(true)
    const missing = HearingSessionSchema.safeParse({ minutes: 45 })
    expect(missing.success).toBe(false)
    expect(missing.error?.issues[0]?.message).toBe('Choose a lecture from the library')
    expect(HearingSessionSchema.safeParse({ lectureId: 1, minutes: 0 }).success).toBe(false)
  })
})

describe('DailyEntrySchema', () => {
  const base = { localDate: '2026-10-24', rounds: 16, reading: [], hearing: [] }

  it('accepts an explicit zero-value day', () => {
    expect(DailyEntrySchema.safeParse({ ...base, rounds: 0 }).success).toBe(true)
  })

  it('rejects negative or fractional rounds', () => {
    expect(DailyEntrySchema.safeParse({ ...base, rounds: -1 }).success).toBe(false)
    expect(DailyEntrySchema.safeParse({ ...base, rounds: 2.5 }).success).toBe(false)
  })

  it('rejects an impossible calendar date', () => {
    expect(DailyEntrySchema.safeParse({ ...base, localDate: '2026-02-30' }).success).toBe(false)
  })

  it('keeps several reading and hearing sessions in order', () => {
    const parsed = DailyEntrySchema.parse({
      ...base,
      reading: [
        { bookId: 1, chapterOrSection: '2.47', minutes: 15 },
        { bookId: 2, minutes: 20 },
      ],
      hearing: [{ lectureId: 4, minutes: 40 }],
    })
    expect(parsed.reading.map((s) => s.bookId)).toEqual([1, 2])
    expect(parsed.hearing).toHaveLength(1)
  })

  it('drops a blank reflection', () => {
    expect(DailyEntrySchema.parse({ ...base, reflection: '   ' }).reflection).toBeUndefined()
  })
})

describe('TargetSchema', () => {
  it('allows zero but not negative or fractional values', () => {
    expect(TargetSchema.safeParse({ rounds: 0, readingMinutes: 0, hearingMinutes: 0 }).success).toBe(true)
    expect(TargetSchema.safeParse({ rounds: 16, readingMinutes: 30, hearingMinutes: -1 }).success).toBe(false)
    expect(TargetSchema.safeParse({ rounds: 16.5, readingMinutes: 30, hearingMinutes: 30 }).success).toBe(false)
  })
})

describe('TargetChoiceSchema', () => {
  it('accepts adopting the recommended target or setting a personal one', () => {
    expect(TargetChoiceSchema.safeParse({ effectiveDate: '2026-10-24', kind: 'RECOMMENDED' }).success).toBe(true)
    expect(
      TargetChoiceSchema.safeParse({
        effectiveDate: '2026-10-24',
        kind: 'PERSONAL',
        target: { rounds: 8, readingMinutes: 15, hearingMinutes: 15 },
      }).success,
    ).toBe(true)
  })

  it('requires a target for a personal choice', () => {
    expect(TargetChoiceSchema.safeParse({ effectiveDate: '2026-10-24', kind: 'PERSONAL' }).success).toBe(false)
  })
})

describe('upper bounds', () => {
  const day = { localDate: '2026-10-24', reading: [], hearing: [] }

  it('refuses more rounds or minutes than a day can hold', () => {
    expect(DailyEntrySchema.safeParse({ ...day, rounds: 200 }).success).toBe(true)
    expect(DailyEntrySchema.safeParse({ ...day, rounds: 201 }).success).toBe(false)
    expect(DailyEntrySchema.safeParse({ ...day, rounds: 3_000_000_000 }).success).toBe(false)
    expect(ReadingSessionSchema.safeParse({ bookId: 6, minutes: 1440 }).success).toBe(true)
    expect(ReadingSessionSchema.safeParse({ bookId: 6, minutes: 1441 }).success).toBe(false)
    expect(TargetSchema.safeParse({ rounds: 201, readingMinutes: 30, hearingMinutes: 30 }).success).toBe(false)
    expect(TargetSchema.safeParse({ rounds: 16, readingMinutes: 1441, hearingMinutes: 30 }).success).toBe(false)
  })

  it('refuses more sessions or longer text than a day needs', () => {
    const session = { bookId: 6, minutes: 5 }
    expect(DailyEntrySchema.safeParse({ ...day, rounds: 16, reading: Array.from({ length: 21 }, () => session) }).success).toBe(false)
    expect(DailyEntrySchema.safeParse({ ...day, rounds: 16, reflection: 'x'.repeat(4001) }).success).toBe(false)
    expect(ReadingSessionSchema.safeParse({ ...session, chapterOrSection: 'x'.repeat(201) }).success).toBe(false)
  })
})
