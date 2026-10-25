import type { LocalDate, TargetChoice, TargetHistory } from '@sadhana/domain'
import { asc, eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { recommendedTargets, targetChoices } from '../db/schema'
import { HttpError } from '../http/errors'

export const recommendedHistory = async (db: Db) =>
  (await db.select().from(recommendedTargets).orderBy(asc(recommendedTargets.effectiveDate), asc(recommendedTargets.id))).map(
    (row) => ({
      effectiveDate: row.effectiveDate,
      target: { rounds: row.rounds, readingMinutes: row.readingMinutes, hearingMinutes: row.hearingMinutes },
    }),
  )

export const toChoice = (row: typeof targetChoices.$inferSelect): TargetChoice =>
  row.kind === 'PERSONAL'
    ? {
        kind: 'PERSONAL',
        effectiveDate: row.effectiveDate,
        target: { rounds: row.rounds ?? 0, readingMinutes: row.readingMinutes ?? 0, hearingMinutes: row.hearingMinutes ?? 0 },
      }
    : { kind: 'RECOMMENDED', effectiveDate: row.effectiveDate }

export const choicesOf = (db: Db, devoteeId: string) =>
  db
    .select()
    .from(targetChoices)
    .where(eq(targetChoices.devoteeId, devoteeId))
    .orderBy(asc(targetChoices.effectiveDate), asc(targetChoices.id))

export async function targetHistory(db: Db, devoteeId: string): Promise<TargetHistory> {
  return { recommended: await recommendedHistory(db), personal: (await choicesOf(db, devoteeId)).map(toChoice) }
}

/** Targets are effective-dated so the past keeps the standard that applied then; none may start before today. */
export function assertNotPast(effectiveDate: LocalDate, today: LocalDate): void {
  if (effectiveDate < today) {
    throw new HttpError(400, { issues: [{ path: ['effectiveDate'], message: 'Choose today or a later date' }] })
  }
}
