import { z } from 'zod'
import { isLocalDate } from './localDate'

export const LocalDateSchema = z.string().refine(isLocalDate, 'Expected a calendar date as YYYY-MM-DD')

export const RoleSchema = z.enum(['DEVOTEE', 'COORDINATOR', 'ADMIN'])

/** Ceilings no honest day reaches; they keep stored numbers inside Postgres integers and payloads small. */
const MAX_ROUNDS = 200
const MAX_MINUTES = 24 * 60
const MAX_SESSIONS = 20
const MAX_TEXT = 200
const MAX_REFLECTION = 4000

const optionalText = z
  .string()
  .trim()
  .max(MAX_TEXT, 'Keep it shorter')
  .transform((text) => text || undefined)
  .optional()
const wholeMinutes = z
  .number({ error: 'Enter minutes' })
  .int('Whole minutes only')
  .positive('Minutes must be more than 0')
  .max(MAX_MINUTES, 'A day has 1440 minutes')
const nonNegativeInt = z.number({ error: 'Enter a number' }).int('Whole numbers only').nonnegative("Can't be negative")

/** A row of the congregation's library (books, lectures), which a session points at rather than naming. */
const libraryId = (message: string) => z.number({ error: message }).int(message).positive(message)

export const ReadingSessionSchema = z.object({
  bookId: libraryId('Choose a book from the library'),
  chapterOrSection: optionalText,
  minutes: wholeMinutes,
})

export const HearingSessionSchema = z.object({
  lectureId: libraryId('Choose a lecture from the library'),
  minutes: wholeMinutes,
})

export const DailyEntrySchema = z.object({
  localDate: LocalDateSchema,
  rounds: z
    .number({ error: 'Enter your rounds' })
    .int('Whole rounds only')
    .nonnegative("Rounds can't be negative")
    .max(MAX_ROUNDS, `At most ${MAX_ROUNDS} rounds`),
  reflection: z
    .string()
    .trim()
    .max(MAX_REFLECTION, 'Keep your reflection under 4000 characters')
    .transform((text) => text || undefined)
    .optional(),
  reading: z.array(ReadingSessionSchema).max(MAX_SESSIONS),
  hearing: z.array(HearingSessionSchema).max(MAX_SESSIONS),
})

export const TargetSchema = z.object({
  rounds: nonNegativeInt.max(MAX_ROUNDS, `At most ${MAX_ROUNDS} rounds`),
  readingMinutes: nonNegativeInt.max(MAX_MINUTES, 'A day has 1440 minutes'),
  hearingMinutes: nonNegativeInt.max(MAX_MINUTES, 'A day has 1440 minutes'),
})

const effectiveDated = z.object({ effectiveDate: LocalDateSchema })

export const EffectiveTargetSchema = effectiveDated.extend({ target: TargetSchema })

export const TargetChoiceSchema = z.discriminatedUnion('kind', [
  effectiveDated.extend({ kind: z.literal('RECOMMENDED') }),
  effectiveDated.extend({ kind: z.literal('PERSONAL'), target: TargetSchema }),
])

export type Role = z.infer<typeof RoleSchema>
export type ReadingSession = z.infer<typeof ReadingSessionSchema>
export type HearingSession = z.infer<typeof HearingSessionSchema>
export type DailyEntry = z.infer<typeof DailyEntrySchema>
export type Target = z.infer<typeof TargetSchema>
export type EffectiveTarget = z.infer<typeof EffectiveTargetSchema>
export type TargetChoice = z.infer<typeof TargetChoiceSchema>
