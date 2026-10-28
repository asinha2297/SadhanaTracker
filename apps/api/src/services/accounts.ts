import type { Account } from '@sadhana/contract'
import { asc, eq } from 'drizzle-orm'
import { hashPassword, temporaryPassword } from '../auth/password'
import type { ArgonOptions } from '../config'
import type { Db } from '../db/client'
import { accounts, resetRequests, type AccountRow } from '../db/schema'
import { endAllSessions } from './sessions'

const byJoining = [asc(accounts.joinedAt), asc(accounts.devoteeId)]

export const listAccounts = (db: Db) => db.select().from(accounts).orderBy(...byJoining)

export const activeAccounts = (db: Db) => db.select().from(accounts).where(eq(accounts.active, true)).orderBy(...byJoining)

export const toAccount = (row: AccountRow): Account => ({
  devoteeId: row.devoteeId,
  name: row.name,
  role: row.role,
  active: row.active,
  joinedAt: row.joinedAt,
  phone: row.phone,
  email: row.email ?? undefined,
  canReviewRecords: row.canReviewRecords,
})

/** Administrators always see individual rows; a coordinator only once granted record review. */
export const mayReview = (account: AccountRow): boolean => account.role === 'ADMIN' || account.canReviewRecords

/** Coordinators look after devotees; only administrators touch other coordinators and administrators. */
export const inCare = (actor: AccountRow, target: { role: AccountRow['role'] }): boolean =>
  actor.role === 'ADMIN' || target.role === 'DEVOTEE'

/**
 * Replaces the password with a one-time one that must be changed at the next sign-in, ending every session and
 * any pending reset request. Shared by the Master admin page and the reset-password command.
 */
export async function issueTemporaryPassword(db: Db, devoteeId: string, argon: ArgonOptions): Promise<string> {
  const password = temporaryPassword()
  await db
    .update(accounts)
    .set({ passwordHash: await hashPassword(password, argon), mustChangePassword: true, updatedAt: new Date() })
    .where(eq(accounts.devoteeId, devoteeId))
  await endAllSessions(db, devoteeId)
  await db.delete(resetRequests).where(eq(resetRequests.devoteeId, devoteeId))
  return password
}
