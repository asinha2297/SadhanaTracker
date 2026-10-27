import type { Account } from '@sadhana/contract'
import { asc, eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { accounts, type AccountRow } from '../db/schema'

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
