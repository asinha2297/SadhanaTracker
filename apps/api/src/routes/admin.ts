import { EffectiveTargetSchema } from '@sadhana/domain'
import { desc } from 'drizzle-orm'
import { Router } from 'express'
import type { AppContext } from '../app'
import { requireAuth, requireCapability } from '../auth/middleware'
import { auditEvents, recommendedTargets } from '../db/schema'
import { validate } from '../http/errors'
import { todayIn } from '../lib/dates'
import { recordAudit } from '../services/audit'
import { assertNotPast, recommendedHistory } from '../services/targets'

const AUDIT_LIMIT = 500

export function adminRoutes(ctx: AppContext): Router {
  const router = Router()
  router.use(requireAuth(ctx), requireCapability('ADMINISTER'))

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
