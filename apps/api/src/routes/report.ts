import { daysBetween, LocalDateSchema, weekRangeOf } from '@sadhana/domain'
import { Router } from 'express'
import { z } from 'zod'
import type { AppContext } from '../app'
import { requireAuth, requireCapability } from '../auth/middleware'
import { HttpError, validate } from '../http/errors'
import { todayIn } from '../lib/dates'
import { mayReview } from '../services/accounts'
import { exportTable, toCsv, toXlsx } from '../services/export'
import { congregationReport } from '../services/reports'

const WeekQuery = z.object({ week: LocalDateSchema.optional() })
const ExportQuery = z.object({ from: LocalDateSchema, to: LocalDateSchema, format: z.enum(['csv', 'xlsx']).default('csv') })
const MAX_EXPORT_DAYS = 366

export function reportRoutes(ctx: AppContext): Router {
  const router = Router()

  router.get('/report', requireAuth(ctx), requireCapability('VIEW_REPORTS'), async (req, res) => {
    const { week } = validate(WeekQuery, req.query)
    const start = week ?? weekRangeOf(todayIn(req.account.timeZone)).start
    res.json({ report: await congregationReport(ctx.db, start, mayReview(req.account)) })
  })

  router.get('/export', requireAuth(ctx), requireCapability('EXPORT_REPORTS'), async (req, res) => {
    const { from, to, format } = validate(ExportQuery, req.query)
    if (from > to || daysBetween(from, to) > MAX_EXPORT_DAYS) {
      throw new HttpError(400, { issues: [{ path: ['to'], message: `Choose a range of at most ${MAX_EXPORT_DAYS} days` }] })
    }
    const table = await exportTable(ctx.db, from, to, mayReview(req.account))
    res.setHeader('Content-Disposition', `attachment; filename="sadhana-${from}-${to}.${format}"`)
    if (format === 'csv') res.type('text/csv').send(toCsv(table))
    else res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(await toXlsx(table))
  })

  return router
}
