import { and, eq, gt, lt } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { SESSION_TTL_SECONDS } from '../auth/tokens'
import type { Db } from '../db/client'
import { accounts, sessions, type AccountRow } from '../db/schema'

export async function startSession(db: Db, devoteeId: string): Promise<string> {
  const id = randomBytes(16).toString('hex')
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
  await db.insert(sessions).values({ id, devoteeId, expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000) })
  return id
}

/** The account behind a live session; nothing once the session was ended or has expired. */
export async function accountForSession(db: Db, sessionId: string): Promise<AccountRow | undefined> {
  const [row] = await db
    .select({ account: accounts })
    .from(sessions)
    .innerJoin(accounts, eq(accounts.devoteeId, sessions.devoteeId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
  return row?.account
}

export const endSession = (db: Db, sessionId: string) => db.delete(sessions).where(eq(sessions.id, sessionId))

export const endAllSessions = (db: Db, devoteeId: string) => db.delete(sessions).where(eq(sessions.devoteeId, devoteeId))
