import { z } from 'zod'

export interface Identifier {
  kind: 'email' | 'phone'
  value: string
}

const SEPARATORS = /[\s\-().]/g

/**
 * Canonical E.164 form of a mobile number as devotees type it: separators are dropped, a
 * leading 00 means +, and a bare Indian number (10 digits, with or without a trunk 0 or 91)
 * gets +91. Numbers from other countries must carry their code with a +.
 */
export function normalizePhone(input: string): string | undefined {
  const compact = input.replace(SEPARATORS, '')
  const international = compact.startsWith('+') ? compact.slice(1) : compact.startsWith('00') ? compact.slice(2) : undefined
  if (international !== undefined) return /^\d{8,15}$/.test(international) ? `+${international}` : undefined
  if (!/^\d+$/.test(compact)) return undefined
  if (compact.length === 10) return `+91${compact}`
  if (compact.length === 11 && compact.startsWith('0')) return `+91${compact.slice(1)}`
  if (compact.length === 12 && compact.startsWith('91')) return `+${compact}`
  return undefined
}

/** The email or mobile number a devotee signs in with, normalized for lookup. */
export function parseIdentifier(input: string): Identifier | undefined {
  const trimmed = input.trim()
  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase()
    return z.email().safeParse(email).success ? { kind: 'email', value: email } : undefined
  }
  const phone = normalizePhone(trimmed)
  return phone ? { kind: 'phone', value: phone } : undefined
}
