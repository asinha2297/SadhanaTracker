import { ProfileInputSchema, PutEntrySchema, RemindersSchema, type Profile, type Reminders } from '@sadhana/contract'
import { isEditable, isLocalDate, LocalDateSchema, TargetChoiceSchema } from '@sadhana/domain'
import { and, eq } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { AppContext } from '../app'
import { requireAuth } from '../auth/middleware'
import { accounts, entries, idempotencyKeys, reminders, targetChoices, type AccountRow } from '../db/schema'
import { HttpError, validate } from '../http/errors'
import { todayIn } from '../lib/dates'
import { assertLibraryIds, entriesBetween, recordsFor, saveSessions } from '../services/entries'
import { assertContactFree } from '../services/identity'
import { consumeVerification } from '../services/otp'
import { assertNotPast, targetHistory } from '../services/targets'

const RangeSchema = z.object({ from: LocalDateSchema, to: LocalDateSchema })
const MAX_IDEMPOTENCY_KEY = 128

const profileOf = (account: AccountRow): Profile => ({
  devoteeId: account.devoteeId,
  name: account.name,
  phone: account.phone,
  email: account.email ?? undefined,
  address: account.address ?? undefined,
})

const remindersOf = (row: typeof reminders.$inferSelect | undefined, account: AccountRow): Reminders =>
  row
    ? { enabled: row.enabled, time: row.time, timeZone: row.timeZone, channel: row.channel }
    : { enabled: false, time: '21:00', timeZone: account.timeZone, channel: 'IN_APP' }

export function meRoutes(ctx: AppContext): Router {
  const router = Router()
  router.use(requireAuth(ctx))

  router.get('/entries', async (req, res) => {
    const { from, to } = validate(RangeSchema, req.query)
    res.json({ entries: await entriesBetween(ctx.db, req.account.devoteeId, from, to) })
  })

  router.put('/entries/:localDate', async (req, res) => {
    const devoteeId = req.account.devoteeId
    const localDate = req.params.localDate
    if (!isLocalDate(localDate)) throw new HttpError(400, { issues: [{ path: ['localDate'], message: 'Invalid date' }] })
    const key = req.get('Idempotency-Key')
    if (key && key.length > MAX_IDEMPOTENCY_KEY) {
      throw new HttpError(400, { issues: [{ path: ['Idempotency-Key'], message: 'Key too long' }] })
    }
    if (key) {
      const seen = await ctx.db.query.idempotencyKeys.findFirst({
        where: and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.devoteeId, devoteeId)),
      })
      if (seen) {
        res.json({ entry: seen.response })
        return
      }
    }
    const input = validate(PutEntrySchema, req.body)
    if (input.localDate !== localDate) {
      throw new HttpError(400, { issues: [{ path: ['localDate'], message: 'Date does not match the URL' }] })
    }
    if (!isEditable(localDate, todayIn(req.account.timeZone))) throw new HttpError(422)
    await assertLibraryIds(ctx.db, input)

    const record = await ctx.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(entries)
        .where(and(eq(entries.devoteeId, devoteeId), eq(entries.localDate, localDate)))
      if (current && current.updatedAt.toISOString() !== input.baseUpdatedAt) {
        const [theirs] = await recordsFor(tx, [current])
        throw new HttpError(409, { entry: theirs })
      }
      const values = { rounds: input.rounds, reflection: input.reflection ?? null, updatedAt: new Date() }
      const [saved] = await tx
        .insert(entries)
        .values({ devoteeId, localDate, ...values })
        .onConflictDoUpdate({ target: [entries.devoteeId, entries.localDate], set: values })
        .returning()
      if (!saved) throw new Error('Entry was not saved')
      await saveSessions(tx, saved.id, input)
      const [response] = await recordsFor(tx, [saved])
      if (!response) throw new Error('Entry was not saved')
      if (key) await tx.insert(idempotencyKeys).values({ key, devoteeId, response }).onConflictDoNothing()
      return response
    })
    res.json({ entry: record })
  })

  router.get('/targets', async (req, res) => {
    res.json(await targetHistory(ctx.db, req.account.devoteeId))
  })

  router.post('/targets', async (req, res) => {
    const choice = validate(TargetChoiceSchema, req.body)
    assertNotPast(choice.effectiveDate, todayIn(req.account.timeZone))
    await ctx.db.insert(targetChoices).values({
      devoteeId: req.account.devoteeId,
      effectiveDate: choice.effectiveDate,
      kind: choice.kind,
      rounds: choice.kind === 'PERSONAL' ? choice.target.rounds : null,
      readingMinutes: choice.kind === 'PERSONAL' ? choice.target.readingMinutes : null,
      hearingMinutes: choice.kind === 'PERSONAL' ? choice.target.hearingMinutes : null,
    })
    res.status(201).json(await targetHistory(ctx.db, req.account.devoteeId))
  })

  router.get('/profile', async (req, res) => {
    res.json({ profile: profileOf(req.account) })
  })

  router.put('/profile', async (req, res) => {
    const input = validate(ProfileInputSchema, req.body)
    await assertContactFree(ctx.db, input, req.account.devoteeId)
    if (input.phone !== req.account.phone) await consumeVerification(ctx.db, ctx.config.sessionSecret, input.phone, input.code)
    const [updated] = await ctx.db
      .update(accounts)
      .set({
        phone: input.phone,
        email: input.email ?? null,
        address: input.address ?? null,
        updatedAt: new Date(),
      })
      .where(eq(accounts.devoteeId, req.account.devoteeId))
      .returning()
    if (!updated) throw new HttpError(404)
    res.json({ profile: profileOf(updated) })
  })

  router.get('/reminders', async (req, res) => {
    const row = await ctx.db.query.reminders.findFirst({ where: eq(reminders.devoteeId, req.account.devoteeId) })
    res.json({ reminders: remindersOf(row, req.account) })
  })

  router.put('/reminders', async (req, res) => {
    const input = validate(RemindersSchema, req.body)
    const [row] = await ctx.db
      .insert(reminders)
      .values({ devoteeId: req.account.devoteeId, ...input })
      .onConflictDoUpdate({ target: reminders.devoteeId, set: input })
      .returning()
    res.json({ reminders: remindersOf(row, req.account) })
  })

  return router
}
