import { CONTACT_IN_USE } from '@sadhana/contract'
import { and, eq, ne, or } from 'drizzle-orm'
import type { Db } from '../db/client'
import { accounts } from '../db/schema'
import { HttpError } from '../http/errors'

export interface Contact {
  phone: string
  email?: string | undefined
}

/** Refuses (409) a mobile number or email that another account already signs in with. */
export async function assertContactFree(db: Db, contact: Contact, exceptDevoteeId?: string): Promise<void> {
  const matches = or(eq(accounts.phone, contact.phone), ...(contact.email ? [eq(accounts.email, contact.email)] : []))
  const rows = await db
    .select({ phone: accounts.phone, email: accounts.email })
    .from(accounts)
    .where(exceptDevoteeId ? and(matches, ne(accounts.devoteeId, exceptDevoteeId)) : matches)
  const issues = (['phone', 'email'] as const)
    .filter((field) => contact[field] && rows.some((row) => row[field] === contact[field]))
    .map((field) => ({ path: [field], message: CONTACT_IN_USE[field] }))
  if (issues.length) throw new HttpError(409, { issues })
}
