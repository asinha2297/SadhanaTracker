import type { EntryRecord } from '@sadhana/contract'
import type { HearingSession, ReadingSession } from '@sadhana/domain'
import { boolean, date, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

const ROLES = ['DEVOTEE', 'COORDINATOR', 'ADMIN'] as const

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const expiresAt = () => timestamp('expires_at', { withTimezone: true }).notNull()

export const groups = pgTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  coordinatorId: text('coordinator_id').notNull(),
  canReviewRecords: boolean('can_review_records').notNull().default(false),
  createdAt: createdAt(),
})

export const accounts = pgTable(
  'accounts',
  {
    devoteeId: text('devotee_id').primaryKey(),
    name: text('name').notNull(),
    role: text('role', { enum: ROLES }).notNull(),
    active: boolean('active').notNull().default(true),
    pending: boolean('pending').notNull().default(false),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    passwordHash: text('password_hash').notNull(),
    groupId: text('group_id').references(() => groups.id, { onDelete: 'set null' }),
    joinedAt: date('joined_at', { mode: 'string' }).notNull(),
    // Sign-in identifiers, stored normalized (E.164, lower-case) so uniqueness holds.
    phone: text('phone').notNull(),
    email: text('email'),
    address: text('address'),
    timeZone: text('time_zone').notNull().default('Asia/Kolkata'),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('accounts_phone_idx').on(table.phone), uniqueIndex('accounts_email_idx').on(table.email)],
)

/** One row per signed-in device; deleting it signs that device out, whatever cookie it still holds. */
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  devoteeId: text('devotee_id')
    .notNull()
    .references(() => accounts.devoteeId, { onDelete: 'cascade' }),
  createdAt: createdAt(),
  expiresAt: expiresAt(),
})

/** The code texted to a mobile number that is being claimed, until it is used or runs out. */
export const phoneVerifications = pgTable('phone_verifications', {
  phone: text('phone').primaryKey(),
  codeHash: text('code_hash').notNull(),
  attempts: integer('attempts').notNull().default(0),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: expiresAt(),
})

/** Rate-limit counters, shared by every API instance. */
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  hits: integer('hits').notNull(),
  resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
})

export const entries = pgTable(
  'entries',
  {
    id: serial('id').primaryKey(),
    devoteeId: text('devotee_id')
      .notNull()
      .references(() => accounts.devoteeId, { onDelete: 'cascade' }),
    localDate: date('local_date', { mode: 'string' }).notNull(),
    rounds: integer('rounds').notNull(),
    reflection: text('reflection'),
    reading: jsonb('reading').$type<ReadingSession[]>().notNull(),
    hearing: jsonb('hearing').$type<HearingSession[]>().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('entries_devotee_date_idx').on(table.devoteeId, table.localDate)],
)

export const idempotencyKeys = pgTable('idempotency_keys', {
  key: text('key').primaryKey(),
  devoteeId: text('devotee_id')
    .notNull()
    .references(() => accounts.devoteeId, { onDelete: 'cascade' }),
  response: jsonb('response').$type<EntryRecord>().notNull(),
  createdAt: createdAt(),
})

export const recommendedTargets = pgTable('recommended_targets', {
  id: serial('id').primaryKey(),
  effectiveDate: date('effective_date', { mode: 'string' }).notNull(),
  rounds: integer('rounds').notNull(),
  readingMinutes: integer('reading_minutes').notNull(),
  hearingMinutes: integer('hearing_minutes').notNull(),
  createdAt: createdAt(),
})

export const targetChoices = pgTable('target_choices', {
  id: serial('id').primaryKey(),
  devoteeId: text('devotee_id')
    .notNull()
    .references(() => accounts.devoteeId, { onDelete: 'cascade' }),
  effectiveDate: date('effective_date', { mode: 'string' }).notNull(),
  kind: text('kind', { enum: ['RECOMMENDED', 'PERSONAL'] }).notNull(),
  rounds: integer('rounds'),
  readingMinutes: integer('reading_minutes'),
  hearingMinutes: integer('hearing_minutes'),
  createdAt: createdAt(),
})

export const reminders = pgTable('reminders', {
  devoteeId: text('devotee_id')
    .primaryKey()
    .references(() => accounts.devoteeId, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(false),
  time: text('time').notNull().default('21:00'),
  timeZone: text('time_zone').notNull().default('Asia/Kolkata'),
  channel: text('channel', { enum: ['IN_APP'] }).notNull().default('IN_APP'),
})

export const resetRequests = pgTable('reset_requests', {
  devoteeId: text('devotee_id')
    .primaryKey()
    .references(() => accounts.devoteeId, { onDelete: 'cascade' }),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
})

export const auditEvents = pgTable('audit_events', {
  id: serial('id').primaryKey(),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  subject: text('subject'),
  details: text('details'),
})

export type AccountRow = typeof accounts.$inferSelect
export type GroupRow = typeof groups.$inferSelect
export type EntryRow = typeof entries.$inferSelect
