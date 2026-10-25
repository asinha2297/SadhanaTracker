import { NewGroupSchema } from '@sadhana/contract'
import { daysBetween, LocalDateSchema, weekRangeOf } from '@sadhana/domain'
import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { AppContext } from '../app'
import { requireAuth, requireCapability } from '../auth/middleware'
import { findAccount, findGroup } from '../db/queries'
import { accounts, groups } from '../db/schema'
import { HttpError, validate } from '../http/errors'
import { param } from '../http/params'
import { todayIn } from '../lib/dates'
import { label, recordAudit } from '../services/audit'
import { exportTable, toCsv, toXlsx } from '../services/export'
import { groupMembers, groupSummary, requireGroup, slugify, toMember, visibleGroups } from '../services/groups'
import { groupReport } from '../services/reports'

const WeekQuery = z.object({ week: LocalDateSchema.optional() })
const ExportQuery = z.object({ from: LocalDateSchema, to: LocalDateSchema, format: z.enum(['csv', 'xlsx']).default('csv') })
const MAX_EXPORT_DAYS = 366

export function groupRoutes(ctx: AppContext): Router {
  const router = Router()
  router.use(requireAuth(ctx))

  router.get('/', requireCapability('VIEW_GROUP_REPORTS'), async (req, res) => {
    const rows = await visibleGroups(ctx.db, req.account)
    res.json({ groups: await Promise.all(rows.map((group) => groupSummary(ctx.db, group))) })
  })

  router.post('/', requireCapability('MANAGE_ROSTER'), async (req, res) => {
    const { name } = validate(NewGroupSchema, req.body)
    const base = slugify(name)
    let id = base
    for (let suffix = 2; await findGroup(ctx.db, id); suffix += 1) id = `${base}-${suffix}`
    const [group] = await ctx.db.insert(groups).values({ id, name, coordinatorId: req.account.devoteeId }).returning()
    if (!group) throw new Error('Group was not created')
    await recordAudit(ctx.db, req.account, 'GROUP_CREATED', group.name)
    res.status(201).json({ group: await groupSummary(ctx.db, group) })
  })

  router.get('/:id/report', requireCapability('VIEW_GROUP_REPORTS'), async (req, res) => {
    const group = await requireGroup(ctx.db, req.account, param(req, 'id'))
    const { week } = validate(WeekQuery, req.query)
    res.json({ report: await groupReport(ctx.db, group, week ?? weekRangeOf(todayIn(req.account.timeZone)).start) })
  })

  router.get('/:id/members', requireCapability('MANAGE_ROSTER'), async (req, res) => {
    const group = await requireGroup(ctx.db, req.account, param(req, 'id'))
    res.json({ members: (await groupMembers(ctx.db, group.id)).map(toMember) })
  })

  router.put('/:id/members/:devoteeId', requireCapability('MANAGE_ROSTER'), async (req, res) => {
    const group = await requireGroup(ctx.db, req.account, param(req, 'id'))
    const account = await findAccount(ctx.db, param(req, 'devoteeId'))
    if (!account) throw new HttpError(404)
    if (req.account.role !== 'ADMIN') {
      const mine = (await visibleGroups(ctx.db, req.account)).map((own) => own.id)
      const free = account.groupId === null || mine.includes(account.groupId)
      if (account.role !== 'DEVOTEE' || !free) throw new HttpError(403)
    }
    await ctx.db.update(accounts).set({ groupId: group.id, updatedAt: new Date() }).where(eq(accounts.devoteeId, account.devoteeId))
    await recordAudit(ctx.db, req.account, 'GROUP_CHANGED', label(account), group.name)
    res.status(204).end()
  })

  router.delete('/:id/members/:devoteeId', requireCapability('MANAGE_ROSTER'), async (req, res) => {
    const group = await requireGroup(ctx.db, req.account, param(req, 'id'))
    const account = await findAccount(ctx.db, param(req, 'devoteeId'))
    if (!account || account.groupId !== group.id) throw new HttpError(404)
    if (account.pending) {
      await ctx.db.delete(accounts).where(eq(accounts.devoteeId, account.devoteeId))
      await recordAudit(ctx.db, req.account, 'JOIN_REQUEST_DECLINED', label(account))
    } else {
      await ctx.db.update(accounts).set({ groupId: null, updatedAt: new Date() }).where(eq(accounts.devoteeId, account.devoteeId))
      await recordAudit(ctx.db, req.account, 'GROUP_CHANGED', label(account), 'No group')
    }
    res.status(204).end()
  })

  router.post('/:id/members/:devoteeId/approve', requireCapability('MANAGE_ROSTER'), async (req, res) => {
    const group = await requireGroup(ctx.db, req.account, param(req, 'id'))
    const [account] = await ctx.db
      .update(accounts)
      .set({ pending: false, active: true, updatedAt: new Date() })
      .where(and(eq(accounts.devoteeId, param(req, 'devoteeId')), eq(accounts.groupId, group.id), eq(accounts.pending, true)))
      .returning()
    if (!account) throw new HttpError(404)
    await recordAudit(ctx.db, req.account, 'ACCOUNT_APPROVED', label(account), group.name)
    res.status(204).end()
  })

  router.get('/:id/export', requireCapability('EXPORT_REPORTS'), async (req, res) => {
    const group = await requireGroup(ctx.db, req.account, param(req, 'id'))
    const { from, to, format } = validate(ExportQuery, req.query)
    if (from > to || daysBetween(from, to) > MAX_EXPORT_DAYS) {
      throw new HttpError(400, { issues: [{ path: ['to'], message: `Choose a range of at most ${MAX_EXPORT_DAYS} days` }] })
    }
    const table = await exportTable(ctx.db, group, from, to)
    res.setHeader('Content-Disposition', `attachment; filename="sadhana-${group.id}-${from}-${to}.${format}"`)
    if (format === 'csv') res.type('text/csv').send(toCsv(table))
    else res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(await toXlsx(table))
  })

  return router
}

export function devoteeRoutes(ctx: AppContext): Router {
  const router = Router()
  router.use(requireAuth(ctx), requireCapability('MANAGE_ROSTER'))

  // Administrators may place anyone; a coordinator sees only devotees without a group or already in their care.
  router.get('/', async (req, res) => {
    const usable = and(eq(accounts.active, true), eq(accounts.pending, false))
    const mine = (await visibleGroups(ctx.db, req.account)).map((group) => group.id)
    const addable =
      req.account.role === 'ADMIN'
        ? usable
        : and(usable, eq(accounts.role, 'DEVOTEE'), mine.length ? or(isNull(accounts.groupId), inArray(accounts.groupId, mine)) : isNull(accounts.groupId))
    const devotees = await ctx.db
      .select({ devoteeId: accounts.devoteeId, name: accounts.name, groupId: accounts.groupId })
      .from(accounts)
      .where(addable)
      .orderBy(asc(accounts.name))
    res.json({ devotees })
  })

  return router
}
