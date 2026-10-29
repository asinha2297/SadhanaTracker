import {
  DailyEntrySchema,
  EffectiveTargetSchema,
  HearingSessionSchema,
  LocalDateSchema,
  normalizePhone,
  ReadingSessionSchema,
  RoleSchema,
  TargetChoiceSchema,
} from '@sadhana/domain'
import { z } from 'zod'

const optionalText = z
  .string()
  .trim()
  .transform((text) => text || undefined)
  .optional()

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((text) => text?.toLowerCase() || undefined)
  .pipe(z.email('Enter a valid email address').optional())

const mobileNumber = z
  .string()
  .trim()
  .transform((text, ctx) => {
    const phone = normalizePhone(text)
    if (phone) return phone
    ctx.addIssue({ code: 'custom', message: text ? 'Enter a valid mobile number' : 'Enter your mobile number' })
    return z.NEVER
  })

export const CONTACT_IN_USE = {
  phone: 'An account with this mobile number already exists.',
  email: 'An account with this email already exists.',
} as const

/** The congregation's library: what devotees pick from when they record reading and hearing. */
const libraryText = (message: string) => z.string().trim().min(1, message).max(200, 'Keep it shorter')

export const BookInputSchema = z.object({ title: libraryText('Enter the book title') })
export type BookInput = z.infer<typeof BookInputSchema>

export const LectureInputSchema = z.object({
  title: libraryText('Enter the lecture title'),
  speaker: optionalText,
  source: optionalText,
})
export type LectureInput = z.infer<typeof LectureInputSchema>

/** `uses` counts the recorded sessions that point at the item; one in use can be renamed but not removed. */
export const BookSchema = BookInputSchema.extend({ id: z.number().int(), uses: z.number().int() })
export type Book = z.infer<typeof BookSchema>

export const LectureSchema = LectureInputSchema.extend({ id: z.number().int(), uses: z.number().int() })
export type Lecture = z.infer<typeof LectureSchema>

export const LibrarySchema = z.object({ books: z.array(BookSchema), lectures: z.array(LectureSchema) })
export type Library = z.infer<typeof LibrarySchema>

export const LIBRARY_DUPLICATE = {
  book: 'This book is already in the library.',
  lecture: 'This lecture by this speaker is already in the library.',
} as const

export const SessionUserSchema = z.object({
  devoteeId: z.string(),
  name: z.string(),
  role: RoleSchema,
  mustChangePassword: z.boolean(),
})
export type SessionUser = z.infer<typeof SessionUserSchema>

const identifier = z.string().trim().min(1, 'Enter your email or mobile number')

export const LoginSchema = z.object({
  identifier,
  password: z.string().min(1, 'Enter your password'),
})
export type LoginInput = z.infer<typeof LoginSchema>

export const ResetRequestSchema = z.object({ identifier })
export type ResetRequestInput = z.infer<typeof ResetRequestSchema>

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'Use at least 8 characters'),
})

/** A saved session also carries the names behind its ids, so records read without another lookup. */
export const ReadingRecordSchema = ReadingSessionSchema.extend({ bookTitle: z.string() })
export const HearingRecordSchema = HearingSessionSchema.extend({
  lectureTitle: z.string(),
  speaker: z.string().optional(),
  source: z.string().optional(),
})

export const EntryRecordSchema = DailyEntrySchema.extend({
  updatedAt: z.string(),
  reading: z.array(ReadingRecordSchema),
  hearing: z.array(HearingRecordSchema),
})
export type EntryRecord = z.infer<typeof EntryRecordSchema>

export const PutEntrySchema = DailyEntrySchema.extend({
  clientUpdatedAt: z.string(),
  baseUpdatedAt: z.string().optional(),
})
export type PutEntryInput = z.infer<typeof PutEntrySchema>

export const TargetHistorySchema = z.object({
  recommended: z.array(EffectiveTargetSchema),
  personal: z.array(TargetChoiceSchema),
})

/** What a devotee may change themselves; a new mobile number needs the code sent to it. */
export const ProfileInputSchema = z.object({
  phone: mobileNumber,
  email: optionalEmail,
  address: optionalText,
})
export type ProfileInput = z.infer<typeof ProfileInputSchema>

export const ProfileSchema = ProfileInputSchema.extend({
  devoteeId: z.string(),
  name: z.string(),
})
export type Profile = z.infer<typeof ProfileSchema>

export const RemindersSchema = z.object({
  enabled: z.boolean(),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time'),
  timeZone: z.string().min(1, 'Choose a time zone'),
  channel: z.literal('IN_APP'),
})
export type Reminders = z.infer<typeof RemindersSchema>

/** An account as those who manage accounts see it. */
export const AccountSchema = z.object({
  devoteeId: z.string(),
  name: z.string(),
  role: RoleSchema,
  active: z.boolean(),
  joinedAt: LocalDateSchema,
  phone: z.string(),
  email: z.string().optional(),
  /** A coordinator with this grant sees individual rows in reports and exports (administrators always do). */
  canReviewRecords: z.boolean(),
})
export type Account = z.infer<typeof AccountSchema>

export const DayStatusSchema = z.enum(['MISSING', 'ZERO_ENTRY', 'RECORDED'])

/** Sums and percentages across days and members; unlike a day's target these have no ceiling. */
const TotalsSchema = z.object({
  rounds: z.number().int().nonnegative(),
  readingMinutes: z.number().int().nonnegative(),
  hearingMinutes: z.number().int().nonnegative(),
})

export const MemberWeekSchema = z.object({
  devoteeId: z.string(),
  name: z.string(),
  days: z.array(DayStatusSchema).length(7),
  totals: TotalsSchema,
  completion: TotalsSchema,
})
export type MemberWeek = z.infer<typeof MemberWeekSchema>

export const ReportSchema = z.object({
  week: z.object({ start: LocalDateSchema, end: LocalDateSchema }),
  summary: z.object({
    members: z.number().int(),
    active: z.number().int(),
    fullyRecorded: z.number().int(),
    totals: TotalsSchema,
    averageCompletion: TotalsSchema,
  }),
  members: z.array(MemberWeekSchema).optional(),
})
export type Report = z.infer<typeof ReportSchema>

export const PendingResetSchema = z.object({ devoteeId: z.string(), name: z.string(), requestedAt: z.string() })
export type PendingReset = z.infer<typeof PendingResetSchema>

export const NewDevoteeSchema = z.object({
  name: z.string().trim().min(1, "Enter the devotee's name").max(200, 'Keep it shorter'),
  phone: mobileNumber,
  email: optionalEmail,
  role: RoleSchema.default('DEVOTEE'),
})
export type NewDevoteeInput = z.infer<typeof NewDevoteeSchema>

export const CreatedDevoteeSchema = z.object({ devotee: AccountSchema, temporaryPassword: z.string() })
export type CreatedDevotee = z.infer<typeof CreatedDevoteeSchema>

export const DevoteePatchSchema = z.object({
  name: z.string().trim().min(1, "Enter the devotee's name").max(200, 'Keep it shorter').optional(),
  phone: mobileNumber.optional(),
  active: z.boolean().optional(),
  role: RoleSchema.optional(),
  canReviewRecords: z.boolean().optional(),
})
export type DevoteePatch = z.infer<typeof DevoteePatchSchema>

export const AuditEventSchema = z.object({
  id: z.string(),
  at: z.string(),
  actor: z.string(),
  action: z.string(),
  subject: z.string().optional(),
  details: z.string().optional(),
})
export type AuditEvent = z.infer<typeof AuditEventSchema>
