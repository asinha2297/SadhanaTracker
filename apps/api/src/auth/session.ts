import type { SessionUser } from '@sadhana/contract'
import type { Response } from 'express'
import type { Config } from '../config'
import type { AccountRow } from '../db/schema'
import { SESSION_TTL_SECONDS } from './tokens'

export const SESSION_COOKIE = 'sadhana_session'

const baseCookie = (config: Config) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: config.cookieSecure,
  path: '/',
})

export const setSessionCookie = (res: Response, token: string, config: Config) =>
  res.cookie(SESSION_COOKIE, token, { ...baseCookie(config), maxAge: SESSION_TTL_SECONDS * 1000 })

export const clearSessionCookie = (res: Response, config: Config) => res.clearCookie(SESSION_COOKIE, baseCookie(config))

export const accountToUser = (account: AccountRow): SessionUser => ({
  devoteeId: account.devoteeId,
  name: account.name,
  role: account.role,
  mustChangePassword: account.mustChangePassword,
})
