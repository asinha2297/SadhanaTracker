import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { en } from '../i18n/en'
import { LoginSchema, loginErrorMessage, NewPasswordSchema, ResetRequestSchema } from './forms'

const messages = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message)

describe('LoginSchema', () => {
  it('trims the identifier and keeps the password as typed', () => {
    expect(LoginSchema.parse({ identifier: ' radhika@example.org ', password: ' haribol ' })).toEqual({
      identifier: 'radhika@example.org',
      password: ' haribol ',
    })
  })

  it('asks for both fields', () => {
    expect(messages(LoginSchema.safeParse({ identifier: '  ', password: '' }))).toEqual([
      'Enter your email or mobile number',
      'Enter your password',
    ])
  })
})

describe('ResetRequestSchema', () => {
  it('asks for the email or mobile number', () => {
    expect(messages(ResetRequestSchema.safeParse({ identifier: ' ' }))).toEqual(['Enter your email or mobile number'])
  })
})

describe('NewPasswordSchema', () => {
  const current = { currentPassword: 'temp-1234' }

  it('accepts a matching pair of at least eight characters', () => {
    expect(NewPasswordSchema.safeParse({ ...current, newPassword: 'govinda-jaya', confirm: 'govinda-jaya' }).success).toBe(true)
  })

  it('asks for the current password and rejects a short new one', () => {
    expect(messages(NewPasswordSchema.safeParse({ currentPassword: '', newPassword: 'short', confirm: 'short' }))).toEqual([
      'Enter your one-time password',
      'Use at least 8 characters',
    ])
  })

  it('rejects a mismatched confirmation on the confirmation field', () => {
    const result = NewPasswordSchema.safeParse({ ...current, newPassword: 'govinda-jaya', confirm: 'govinda-jay' })
    expect(result.error?.issues).toEqual([expect.objectContaining({ path: ['confirm'], message: "Passwords don't match" })])
  })
})

describe('loginErrorMessage', () => {
  it('explains each sign-in failure warmly', () => {
    expect(loginErrorMessage(en, new ApiError(401))).toBe("That email or mobile number and password don't match. Please try again.")
    expect(loginErrorMessage(en, new ApiError(403))).toBe('This account is inactive. Please speak with your coordinator.')
    expect(loginErrorMessage(en, new ApiError(429))).toBe('Too many attempts. Please wait a few minutes and try again.')
  })

  it('distinguishes a server problem from no connection', () => {
    expect(loginErrorMessage(en, new ApiError(500))).toBe("We couldn't sign you in just now. Please try again in a moment.")
    expect(loginErrorMessage(en, new TypeError('fetch failed'))).toBe(
      "We couldn't reach the server. Check your connection and try again.",
    )
  })
})
