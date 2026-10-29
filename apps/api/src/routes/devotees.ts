import { DevoteePatchSchema, NewDevoteeSchema } from '@sadhana/contract'
import { and, asc, count, eq, ne } from 'drizzle-orm'
import { Router } from 'express'
import type { AppContext } from '../app'
import { requireAuth, requireCapability } from '../auth/middleware'
import { hashPassword, temporaryPassword } from '../auth/password'
import { findAccount, newDevoteeId } from '../db/queries'
import { accounts, resetRequests } from '../db/schema'
import { HttpError, validate } from '../http/errors'
import { param } from '../http/params'
import { todayIn } from '../lib/dates'
import { inCare, issueTemporaryPassword, listAccounts, toAccount } from '../services/accounts'
import { label, recordAudit } from '../services/audit'
import { assertContactFree } from '../services/identity'

export function devoteeRoutes(ctx: AppContext): Router {
  const router = Router()
  router.use(requireAuth(ctx), requireCapability('MANAGE_ACCOUNTS'))

  router.get('/', async (_req, res) => {
    res.json({ devotees: (await listAccounts(ctx.db)).map(toAccount) })
  })

  router.get('/reset-requests', async (req, res) => {
    const rows = await ctx.db
      .select({ devoteeId: resetRequests.devoteeId, name: accounts.name, role: accounts.role, requestedAt: resetRequests.requestedAt })
      .from(resetRequests)
      .innerJoin(accounts, eq(accounts.devoteeId, resetRequests.devoteeId))
      .orderBy(asc(resetRequests.requestedAt))
    res.json({
      requests: rows
        .filter((row) => inCare(req.account, row))
        .map(({ devoteeId, name, requestedAt }) => ({ devoteeId, name, requestedAt: requestedAt.toISOString() })),
    })
  })

  router.post('/', async (req, res) => {
    const input = validate(NewDevoteeSchema, req.body)
    if (!inCare(req.account, input)) throw new HttpError(403)
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
        joinedAt: todayIn(req.account.timeZone),
        phone: input.phone,
        email: input.email ?? null,
      })
      .returning()
    if (!account) throw new Error('Account was not created')
    await recordAudit(ctx.db, req.account, 'ACCOUNT_CREATED', label(account), input.role)
    res.status(201).json({ devotee: toAccount(account), temporaryPassword: password })
  })

  router.patch('/:id', requireCapability('ADMINISTER'), async (req, res) => {
    const patch = validate(DevoteePatchSchema, req.body)
    const account = await findAccount(ctx.db, param(req, 'id'))
    if (!account) throw new HttpError(404)
    const losesAdmin = account.role === 'ADMIN' && account.active && (patch.active === false || (patch.role && patch.role !== 'ADMIN'))
    if (losesAdmin) {
      const [others] = await ctx.db
        .select({ n: count() })
        .from(accounts)
        .where(and(eq(accounts.role, 'ADMIN'), eq(accounts.active, true), ne(accounts.devoteeId, account.devoteeId)))
      if (!others?.n) throw new HttpError(409, { reason: 'LAST_ADMIN' })
    }
    if (patch.active !== undefined && patch.active !== account.active) {
      await recordAudit(ctx.db, req.account, patch.active ? 'ACCOUNT_REACTIVATED' : 'ACCOUNT_DEACTIVATED', label(account))
    }
    if (patch.role && patch.role !== account.role) await recordAudit(ctx.db, req.account, 'ROLE_CHANGED', label(account), patch.role)
    if (patch.name !== undefined && patch.name !== account.name) {
      await recordAudit(ctx.db, req.account, 'NAME_CHANGED', label({ ...account, name: patch.name }), `was ${account.name}`)
    }
    if (patch.phone !== undefined && patch.phone !== account.phone) {
      await assertContactFree(ctx.db, { phone: patch.phone }, account.devoteeId)
      await recordAudit(ctx.db, req.account, 'PHONE_CHANGED', label(account), `was ${account.phone}`)
    }
    if (patch.canReviewRecords !== undefined && patch.canReviewRecords !== account.canReviewRecords) {
      await recordAudit(ctx.db, req.account, patch.canReviewRecords ? 'RECORD_REVIEW_GRANTED' : 'RECORD_REVIEW_REVOKED', label(account))
    }
    const [updated] = await ctx.db
      .update(accounts)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(accounts.devoteeId, account.devoteeId))
      .returning()
    if (!updated) throw new HttpError(404)
    res.json({ devotee: toAccount(updated) })
  })

  router.post('/:id/reset-password', async (req, res) => {
    const account = await findAccount(ctx.db, param(req, 'id'))
    if (!account) throw new HttpError(404)
    if (!inCare(req.account, account)) throw new HttpError(403)
    const password = await issueTemporaryPassword(ctx.db, account.devoteeId, ctx.config.argon)
    await recordAudit(ctx.db, req.account, 'PASSWORD_RESET_ISSUED', label(account))
    res.json({ temporaryPassword: password })
  })

  return router
}
