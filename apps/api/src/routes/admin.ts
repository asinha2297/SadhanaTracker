import { DevoteePatchSchema, NewDevoteeSchema } from '@sadhana/contract'
import { EffectiveTargetSchema } from '@sadhana/domain'
import { and, asc, count, desc, eq, ne } from 'drizzle-orm'
import { Router } from 'express'
import type { AppContext } from '../app'
import { requireAuth, requireCapability } from '../auth/middleware'
import { hashPassword, temporaryPassword } from '../auth/password'
import { findAccount, findGroup, newDevoteeId } from '../db/queries'
import { accounts, auditEvents, recommendedTargets, resetRequests } from '../db/schema'
import { HttpError, validate } from '../http/errors'
import { todayIn } from '../lib/dates'
import { label, recordAudit } from '../services/audit'
import { toMember } from '../services/groups'
import { assertContactFree } from '../services/identity'
import { endAllSessions } from '../services/sessions'
import { assertNotPast, recommendedHistory } from '../services/targets'

const AUDIT_LIMIT = 500

export function adminRoutes(ctx: AppContext): Router {
  const router = Router()
  router.use(requireAuth(ctx), requireCapability('ADMINISTER'))

  router.get('/reset-requests', async (_req, res) => {
    const rows = await ctx.db
      .select({ devoteeId: resetRequests.devoteeId, name: accounts.name, requestedAt: resetRequests.requestedAt })
      .from(resetRequests)
      .innerJoin(accounts, eq(accounts.devoteeId, resetRequests.devoteeId))
      .orderBy(asc(resetRequests.requestedAt))
    res.json({ requests: rows.map((row) => ({ ...row, requestedAt: row.requestedAt.toISOString() })) })
  })

  router.post('/devotees', async (req, res) => {
    const input = validate(NewDevoteeSchema, req.body)
    const group = input.groupId ? await findGroup(ctx.db, input.groupId) : undefined
    if (input.groupId && !group) throw new HttpError(400, { issues: [{ path: ['groupId'], message: 'Unknown group' }] })
    await assertContactFree(ctx.db, input)
    const password = temporaryPassword()
    const [account] = await ctx.db
      .insert(accounts)
      .values({
        devoteeId: await newDevoteeId(ctx.db),
        name: input.name,
        role: input.role,
        mustChangePassword: true,
        passwordHash: await hashPassword(password, ctx.config.argon),
        groupId: input.groupId,
        joinedAt: todayIn(req.account.timeZone),
        phone: input.phone,
        email: input.email ?? null,
      })
      .returning()
    if (!account) throw new Error('Account was not created')
    await recordAudit(ctx.db, req.account, 'ACCOUNT_CREATED', label(account), `${input.role}${group ? `, ${group.name}` : ''}`)
    res.status(201).json({ devotee: toMember(account), temporaryPassword: password })
  })

  router.patch('/devotees/:id', async (req, res) => {
    const patch = validate(DevoteePatchSchema, req.body)
    const account = await findAccount(ctx.db, req.params.id)
    if (!account) throw new HttpError(404)
    const losesAdmin = account.role === 'ADMIN' && account.active && (patch.active === false || (patch.role && patch.role !== 'ADMIN'))
    if (losesAdmin) {
      const [others] = await ctx.db
        .select({ n: count() })
        .from(accounts)
        .where(and(eq(accounts.role, 'ADMIN'), eq(accounts.active, true), ne(accounts.devoteeId, account.devoteeId)))
      if (!others?.n) throw new HttpError(409, { reason: 'LAST_ADMIN' })
    }
    if (patch.groupId && !(await findGroup(ctx.db, patch.groupId))) {
      throw new HttpError(400, { issues: [{ path: ['groupId'], message: 'Unknown group' }] })
    }
    if (patch.active !== undefined && patch.active !== account.active) {
      await recordAudit(ctx.db, req.account, patch.active ? 'ACCOUNT_REACTIVATED' : 'ACCOUNT_DEACTIVATED', label(account))
    }
    if (patch.role && patch.role !== account.role) await recordAudit(ctx.db, req.account, 'ROLE_CHANGED', label(account), patch.role)
    if (patch.name !== undefined && patch.name !== account.name) {
      await recordAudit(ctx.db, req.account, 'NAME_CHANGED', label({ ...account, name: patch.name }), `was ${account.name}`)
    }
    if (patch.groupId !== undefined && patch.groupId !== account.groupId) {
      await recordAudit(ctx.db, req.account, 'GROUP_CHANGED', label(account), patch.groupId ?? 'No group')
    }
    const [updated] = await ctx.db
      .update(accounts)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(accounts.devoteeId, account.devoteeId))
      .returning()
    if (!updated) throw new HttpError(404)
    res.json({ devotee: toMember(updated) })
  })

  router.post('/devotees/:id/reset-password', async (req, res) => {
    const account = await findAccount(ctx.db, req.params.id)
    if (!account) throw new HttpError(404)
    const password = temporaryPassword()
    await ctx.db
      .update(accounts)
      .set({ passwordHash: await hashPassword(password, ctx.config.argon), mustChangePassword: true, updatedAt: new Date() })
      .where(eq(accounts.devoteeId, account.devoteeId))
    await endAllSessions(ctx.db, account.devoteeId)
    await ctx.db.delete(resetRequests).where(eq(resetRequests.devoteeId, account.devoteeId))
    await recordAudit(ctx.db, req.account, 'PASSWORD_RESET_ISSUED', label(account))
    res.json({ temporaryPassword: password })
  })

  router.post('/targets', async (req, res) => {
    const input = validate(EffectiveTargetSchema, req.body)
    assertNotPast(input.effectiveDate, todayIn(req.account.timeZone))
    await ctx.db.insert(recommendedTargets).values({ effectiveDate: input.effectiveDate, ...input.target })
    const { rounds, readingMinutes, hearingMinutes } = input.target
    await recordAudit(
      ctx.db,
      req.account,
      'RECOMMENDED_TARGET_SET',
      undefined,
      `${rounds} rounds · ${readingMinutes} min reading · ${hearingMinutes} min hearing, effective ${input.effectiveDate}`,
    )
    res.status(201).json({ recommended: await recommendedHistory(ctx.db) })
  })

  router.get('/audit', async (_req, res) => {
    const rows = await ctx.db.select().from(auditEvents).orderBy(desc(auditEvents.at), desc(auditEvents.id)).limit(AUDIT_LIMIT)
    res.json({
      events: rows.map((row) => ({
        id: String(row.id),
        at: row.at.toISOString(),
        actor: row.actor,
        action: row.action,
        subject: row.subject ?? undefined,
        details: row.details ?? undefined,
      })),
    })
  })

  return router
}
