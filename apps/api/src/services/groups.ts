import type { Group, Member } from '@sadhana/contract'
import { and, asc, count, eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { accounts, groups, type AccountRow, type GroupRow } from '../db/schema'
import { HttpError } from '../http/errors'

export const visibleGroups = (db: Db, account: AccountRow) =>
  account.role === 'ADMIN'
    ? db.select().from(groups).orderBy(asc(groups.name))
    : db.select().from(groups).where(eq(groups.coordinatorId, account.devoteeId)).orderBy(asc(groups.name))

export async function requireGroup(db: Db, account: AccountRow, groupId: string): Promise<GroupRow> {
  const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) })
  if (!group) throw new HttpError(404)
  if (account.role !== 'ADMIN' && group.coordinatorId !== account.devoteeId) throw new HttpError(403)
  return group
}

export const groupMembers = (db: Db, groupId: string) =>
  db.select().from(accounts).where(eq(accounts.groupId, groupId)).orderBy(asc(accounts.joinedAt), asc(accounts.devoteeId))

export const activeMembers = (db: Db, groupId: string) =>
  db
    .select()
    .from(accounts)
    .where(and(eq(accounts.groupId, groupId), eq(accounts.active, true), eq(accounts.pending, false)))
    .orderBy(asc(accounts.joinedAt), asc(accounts.devoteeId))

export async function groupSummary(db: Db, group: GroupRow): Promise<Group> {
  const [row] = await db
    .select({ members: count() })
    .from(accounts)
    .where(and(eq(accounts.groupId, group.id), eq(accounts.active, true), eq(accounts.pending, false)))
  return { id: group.id, name: group.name, memberCount: row?.members ?? 0, canReviewRecords: group.canReviewRecords }
}

export const toMember = (account: AccountRow): Member => ({
  devoteeId: account.devoteeId,
  name: account.name,
  role: account.role,
  active: account.active,
  pending: account.pending,
  joinedAt: account.joinedAt,
  phone: account.phone,
  email: account.email ?? undefined,
})

export const slugify = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'group'
