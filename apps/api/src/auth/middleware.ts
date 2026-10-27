import { hasCapability, type Capability } from '@sadhana/domain'
import type { RequestHandler } from 'express'
import type { AppContext } from '../app'
import { HttpError } from '../http/errors'
import { accountForSession } from '../services/sessions'
import { SESSION_COOKIE } from './session'
import { readToken } from './tokens'

interface AuthOptions {
  /** Lets an account still holding a one-time password through (session, password change, sign-out). */
  allowPasswordChange?: boolean
}

export const requireAuth =
  <Params = Record<string, string>>(ctx: AppContext, options: AuthOptions = {}): RequestHandler<Params> =>
  async (req, _res, next) => {
    const token = (req.cookies as Record<string, string | undefined>)[SESSION_COOKIE]
    const sessionId = token ? await readToken(token, ctx.config.sessionSecret) : undefined
    const account = sessionId ? await accountForSession(ctx.db, sessionId) : undefined
    if (!sessionId || !account || !account.active) throw new HttpError(401)
    if (account.mustChangePassword && !options.allowPasswordChange) throw new HttpError(403, { reason: 'PASSWORD_CHANGE_REQUIRED' })
    req.account = account
    req.sessionId = sessionId
    next()
  }

export const requireCapability =
  <Params = Record<string, string>>(capability: Capability): RequestHandler<Params> =>
  (req, _res, next) => {
    if (!hasCapability(req.account.role, capability)) throw new HttpError(403)
    next()
  }
