import type { EntryRecord } from '@sadhana/contract'
import { sql } from 'drizzle-orm'
import { boolean, date, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

const ROLES = ['DEVOTEE', 'COORDINATOR', 'ADMIN'] as const

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const expiresAt = () => timestamp('expires_at', { withTimezone: true }).notNull()

export const accounts = pgTable(
  'accounts',
  {
    devoteeId: text('devotee_id').primaryKey(),
    name: text('name').notNull(),
    role: text('role', { enum: ROLES }).notNull(),
    active: boolean('active').notNull().default(true),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    passwordHash: text('password_hash').notNull(),
    // A coordinator with this grant sees individual rows in reports and exports; administrators always do.
    canReviewRecords: boolean('can_review_records').notNull().default(false),
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
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('entries_devotee_date_idx').on(table.devoteeId, table.localDate)],
)

/** The congregation's library. Titles are unique regardless of case; a lecture is unique per speaker. */
export const books = pgTable(
  'books',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex('books_title_idx').on(sql`lower(${table.title})`)],
)

export const lectures = pgTable(
  'lectures',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    speaker: text('speaker'),
    source: text('source'),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex('lectures_title_speaker_idx').on(sql`lower(${table.title})`, sql`lower(coalesce(${table.speaker}, ''))`)],
)

/** A day's reading and hearing, one row per session, pointing at the library rather than naming titles. */
export const readingSessions = pgTable(
  'reading_sessions',
  {
    id: serial('id').primaryKey(),
    entryId: integer('entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id),
    chapterOrSection: text('chapter_or_section'),
    minutes: integer('minutes').notNull(),
  },
  (table) => [index('reading_sessions_entry_idx').on(table.entryId), index('reading_sessions_book_idx').on(table.bookId)],
)

export const hearingSessions = pgTable(
  'hearing_sessions',
  {
    id: serial('id').primaryKey(),
    entryId: integer('entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    lectureId: integer('lecture_id')
      .notNull()
      .references(() => lectures.id),
    minutes: integer('minutes').notNull(),
  },
  (table) => [index('hearing_sessions_entry_idx').on(table.entryId), index('hearing_sessions_lecture_idx').on(table.lectureId)],
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
export type EntryRow = typeof entries.$inferSelect
