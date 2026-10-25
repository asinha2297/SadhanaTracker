import { VERIFICATION } from '@sadhana/contract'
import { eq, lt, sql } from 'drizzle-orm'
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import type { Db } from '../db/client'
import { phoneVerifications } from '../db/schema'
import { HttpError } from '../http/errors'
import type { SmsSender } from './sms'

export const CODE_TTL_MS = 10 * 60 * 1000
export const RESEND_AFTER_MS = 60 * 1000
export const MAX_TRIES = 5

const hashCode = (secret: Uint8Array, phone: string, code: string) =>
  createHmac('sha256', secret).update(`${phone}:${code}`).digest()

const refuse = (message: string) => new HttpError(400, { issues: [{ path: ['code'], message }] })

/** Texts a fresh six-digit code to `phone`, at most once a minute. */
export async function sendVerification(db: Db, sms: SmsSender, secret: Uint8Array, phone: string): Promise<void> {
  const existing = await db.query.phoneVerifications.findFirst({ where: eq(phoneVerifications.phone, phone) })
  if (existing && existing.sentAt.getTime() > Date.now() - RESEND_AFTER_MS) throw new HttpError(429)
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const fresh = {
    codeHash: hashCode(secret, phone, code).toString('hex'),
    attempts: 0,
    sentAt: new Date(),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  }
  await db.delete(phoneVerifications).where(lt(phoneVerifications.expiresAt, new Date(Date.now() - CODE_TTL_MS)))
  await db.insert(phoneVerifications).values({ phone, ...fresh }).onConflictDoUpdate({ target: phoneVerifications.phone, set: fresh })
  await sms.send({ to: phone, message: `Haribol! ${code} is your Sharanagati Sadhana Tracker code. It expires in 10 minutes.` })
}

/** Accepts `code` for `phone` once; wrong guesses count towards the limit. */
export async function consumeVerification(db: Db, secret: Uint8Array, phone: string, code: string | undefined): Promise<void> {
  if (!code) throw refuse(VERIFICATION.required)
  const pending = await db.query.phoneVerifications.findFirst({ where: eq(phoneVerifications.phone, phone) })
  if (!pending) throw refuse(VERIFICATION.wrong)
  if (pending.expiresAt.getTime() < Date.now()) throw refuse(VERIFICATION.expired)
  if (pending.attempts >= MAX_TRIES) throw refuse(VERIFICATION.exhausted)
  if (!timingSafeEqual(Buffer.from(pending.codeHash, 'hex'), hashCode(secret, phone, code))) {
    await db
      .update(phoneVerifications)
      .set({ attempts: sql`${phoneVerifications.attempts} + 1` })
      .where(eq(phoneVerifications.phone, phone))
    throw refuse(VERIFICATION.wrong)
  }
  await db.delete(phoneVerifications).where(eq(phoneVerifications.phone, phone))
}
