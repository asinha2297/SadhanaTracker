import {
  DailyEntrySchema,
  EffectiveTargetSchema,
  LocalDateSchema,
  normalizePhone,
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

export const VERIFICATION = {
  required: 'Verify your new mobile number with the code we sent',
  wrong: "That code isn't right. Check the SMS and try again.",
  expired: 'This code has expired. Request a new one.',
  exhausted: 'Too many wrong tries. Request a new code.',
} as const

const verificationCode = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code we sent')

const optionalCode = z
  .string()
  .trim()
  .optional()
  .transform((text) => text || undefined)
  .pipe(verificationCode.optional())

export const OtpRequestSchema = z.object({ phone: mobileNumber })

export const BOOKS = [
  'Bhagavad-gītā As It Is',
  'Śrīmad-Bhāgavatam',
  'Śrī Caitanya-caritāmṛta',
  'The Nectar of Devotion',
  'The Nectar of Instruction',
  'Śrī Īśopaniṣad',
  'Kṛṣṇa, the Supreme Personality of Godhead',
  'Teachings of Lord Caitanya',
  'The Science of Self-Realization',
  'Śrī Brahma-saṁhitā',
] as const

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

export const EntryRecordSchema = DailyEntrySchema.extend({ updatedAt: z.string() })
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
  code: optionalCode,
})
export type ProfileInput = z.infer<typeof ProfileInputSchema>

export const ProfileSchema = ProfileInputSchema.omit({ code: true }).extend({
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
