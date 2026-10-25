import type { Identifier } from '@sadhana/domain'
import { eq } from 'drizzle-orm'
import { randomInt } from 'node:crypto'
import type { Db } from './client'
import { accounts, groups } from './schema'

export const findAccount = (db: Db, devoteeId: string) =>
  db.query.accounts.findFirst({ where: eq(accounts.devoteeId, devoteeId) })

export const findAccountByIdentifier = (db: Db, { kind, value }: Identifier) =>
  db.query.accounts.findFirst({ where: eq(kind === 'email' ? accounts.email : accounts.phone, value) })

export const findGroup = (db: Db, id: string) => db.query.groups.findFirst({ where: eq(groups.id, id) })

/** SH- and six random digits: nothing to count up from, and the roster reads as it always did. */
export async function newDevoteeId(db: Db): Promise<string> {
  for (;;) {
    const candidate = `SH-${randomInt(100_000, 1_000_000)}`
    if (!(await findAccount(db, candidate))) return candidate
  }
}
