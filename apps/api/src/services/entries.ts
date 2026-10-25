import type { EntryRecord } from '@sadhana/contract'
import type { LocalDate } from '@sadhana/domain'
import { and, asc, eq, gte, lte } from 'drizzle-orm'
import type { Db } from '../db/client'
import { entries, type EntryRow } from '../db/schema'

export const toRecord = (row: EntryRow): EntryRecord => ({
  localDate: row.localDate,
  rounds: row.rounds,
  reflection: row.reflection ?? undefined,
  reading: row.reading,
  hearing: row.hearing,
  updatedAt: row.updatedAt.toISOString(),
})

export const entriesBetween = (db: Db, devoteeId: string, from: LocalDate, to: LocalDate) =>
  db
    .select()
    .from(entries)
    .where(and(eq(entries.devoteeId, devoteeId), gte(entries.localDate, from), lte(entries.localDate, to)))
    .orderBy(asc(entries.localDate))
