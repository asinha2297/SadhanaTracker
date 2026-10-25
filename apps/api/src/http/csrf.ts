import type { RequestHandler } from 'express'
import { HttpError } from './errors'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const originHost = (origin: string): string | undefined => {
  try {
    return new URL(origin).host
  } catch {
    return undefined
  }
}

/**
 * Browsers say where a request came from (Fetch Metadata, failing that Origin), so a state-changing
 * request from another site is refused before any handler runs. Non-browser clients send neither.
 * Behind a trusted proxy the Host header may be the proxy's own; the original travels in X-Forwarded-Host.
 */
export const rejectCrossSite =
  (trustProxy: boolean): RequestHandler =>
  (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next()
    const site = req.get('Sec-Fetch-Site')
    const origin = req.get('Origin')
    const forwarded = trustProxy ? req.get('X-Forwarded-Host')?.split(',')[0]?.trim() : undefined
    const host = forwarded || req.get('Host')
    const crossSite = site ? site !== 'same-origin' && site !== 'none' : origin !== undefined && originHost(origin) !== host
    if (crossSite) throw new HttpError(403, { reason: 'CROSS_SITE' })
    next()
  }
