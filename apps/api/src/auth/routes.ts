import { ChangePasswordSchema, LoginSchema, ResetRequestSchema } from '@sadhana/contract'
import { parseIdentifier } from '@sadhana/domain'
import { eq } from 'drizzle-orm'
import { Router, type Request, type Response } from 'express'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import type { AppContext } from '../app'
import { findAccountByIdentifier } from '../db/queries'
import { accounts, resetRequests } from '../db/schema'
import { HttpError, validate } from '../http/errors'
import { DbRateLimitStore } from '../http/rateLimitStore'
import { endAllSessions, endSession, startSession } from '../services/sessions'
import { requireAuth } from './middleware'
import { hashPassword, verifyPassword } from './password'
import { accountToUser, clearSessionCookie, SESSION_COOKIE, setSessionCookie } from './session'
import { issueToken, readToken } from './tokens'

const WINDOW_MS = 15 * 60 * 1000

/** The identifier an attempt is for, normalized so spellings of one number share a limit. */
const attemptedIdentifier = (body: unknown): string => {
  const raw =
    typeof body === 'object' && body !== null && 'identifier' in body && typeof body.identifier === 'string'
      ? body.identifier
      : ''
  return parseIdentifier(raw)?.value ?? raw.trim().toLowerCase()
}

const byAddress = (req: Request) => ipKeyGenerator(req.ip ?? '')

export function authRoutes(ctx: AppContext): Router {
  const router = Router()
  const decoyHash = hashPassword('sharanagati-decoy', ctx.config.argon)
  const secret = ctx.config.sessionSecret

  const limiter = (name: string, limit: number, keyGenerator: (req: Request) => string, skipSuccessfulRequests = false) =>
    rateLimit({
      windowMs: WINDOW_MS,
      limit,
      skipSuccessfulRequests,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      keyGenerator,
      store: new DbRateLimitStore(ctx.db, name),
      handler: (_req, res) => {
        res.status(429).end()
      },
    })
  // Five wrong passwords per identifier, thirty per address whatever the identifier, and a cap on
  // reset requests per address.
  const loginLimiter = limiter('login', 5, (req) => `${byAddress(req)}:${attemptedIdentifier(req.body)}`, true)
  const sprayLimiter = limiter('spray', 30, byAddress, true)
  const publicLimiter = limiter('public', 30, byAddress)

  const openSession = async (res: Response, devoteeId: string) =>
    setSessionCookie(res, await issueToken(await startSession(ctx.db, devoteeId), secret), ctx.config)

  router.post('/login', sprayLimiter, loginLimiter, async (req, res) => {
    const { identifier, password } = validate(LoginSchema, req.body)
    const parsed = parseIdentifier(identifier)
    const account = parsed && (await findAccountByIdentifier(ctx.db, parsed))
    const valid = await verifyPassword(account?.passwordHash ?? (await decoyHash), password)
    if (!account || !valid) throw new HttpError(401)
    if (!account.active) throw new HttpError(403, { reason: 'INACTIVE' })
    await openSession(res, account.devoteeId)
    res.json({ user: accountToUser(account) })
  })

  router.post('/logout', async (req, res) => {
    const token = (req.cookies as Record<string, string | undefined>)[SESSION_COOKIE]
    const sessionId = token ? await readToken(token, secret) : undefined
    if (sessionId) await endSession(ctx.db, sessionId)
    clearSessionCookie(res, ctx.config)
    res.status(204).end()
  })

  router.post('/logout-all', requireAuth(ctx, { allowPasswordChange: true }), async (req, res) => {
    await endAllSessions(ctx.db, req.account.devoteeId)
    clearSessionCookie(res, ctx.config)
    res.status(204).end()
  })

  router.get('/session', requireAuth(ctx, { allowPasswordChange: true }), (req, res) => {
    res.json({ user: accountToUser(req.account) })
  })

  router.post('/password', requireAuth(ctx, { allowPasswordChange: true }), async (req, res) => {
    const { currentPassword, newPassword } = validate(ChangePasswordSchema, req.body)
    if (!(await verifyPassword(req.account.passwordHash, currentPassword))) {
      throw new HttpError(400, { issues: [{ path: ['currentPassword'], message: "That isn't your current password." }] })
    }
    await ctx.db
      .update(accounts)
      .set({ passwordHash: await hashPassword(newPassword, ctx.config.argon), mustChangePassword: false, updatedAt: new Date() })
      .where(eq(accounts.devoteeId, req.account.devoteeId))
    // Every other device is signed out; this one continues on a fresh session.
    await endAllSessions(ctx.db, req.account.devoteeId)
    await openSession(res, req.account.devoteeId)
    res.json({ user: { ...accountToUser(req.account), mustChangePassword: false } })
  })

  router.post('/reset-request', publicLimiter, async (req, res) => {
    const { identifier } = validate(ResetRequestSchema, req.body)
    const parsed = parseIdentifier(identifier)
    const account = parsed && (await findAccountByIdentifier(ctx.db, parsed))
    if (account) {
      await ctx.db.insert(resetRequests).values({ devoteeId: account.devoteeId }).onConflictDoNothing()
    }
    res.status(202).end()
  })

  return router
}
