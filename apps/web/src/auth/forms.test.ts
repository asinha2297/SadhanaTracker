import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { LoginSchema, loginErrorMessage, NewPasswordSchema, ResetRequestSchema, SignupSchema } from './forms'

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

describe('SignupSchema', () => {
  const valid = {
    name: 'Haridāsa Dāsa',
    groupId: 'sharanagati',
    phone: '98450 00200',
    code: ' 123456 ',
    password: 'govinda-jaya',
    confirm: 'govinda-jaya',
  }

  it('requires the six-digit code from the SMS', () => {
    expect(SignupSchema.parse(valid).code).toBe('123456')
    expect(messages(SignupSchema.safeParse({ ...valid, code: '' }))).toEqual(['Enter the 6-digit code we sent'])
    expect(messages(SignupSchema.safeParse({ ...valid, code: '12345' }))).toEqual(['Enter the 6-digit code we sent'])
  })

  it('requires a valid mobile number and normalizes it', () => {
    expect(SignupSchema.parse(valid).phone).toBe('+919845000200')
    expect(messages(SignupSchema.safeParse({ ...valid, phone: '' }))).toEqual(['Enter your mobile number'])
    expect(messages(SignupSchema.safeParse({ ...valid, phone: '12' }))).toEqual(['Enter a valid mobile number'])
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
    expect(loginErrorMessage(new ApiError(401))).toBe("That email or mobile number and password don't match. Please try again.")
    expect(loginErrorMessage(new ApiError(403))).toBe('This account is inactive. Please speak with your coordinator.')
    expect(loginErrorMessage(new ApiError(403, { reason: 'PENDING' }))).toBe(
      'This account is awaiting approval from your coordinator. You will be able to sign in once it is approved.',
    )
    expect(loginErrorMessage(new ApiError(429))).toBe('Too many attempts. Please wait a few minutes and try again.')
  })

  it('distinguishes a server problem from no connection', () => {
    expect(loginErrorMessage(new ApiError(500))).toBe("We couldn't sign you in just now. Please try again in a moment.")
    expect(loginErrorMessage(new TypeError('fetch failed'))).toBe(
      "We couldn't reach the server. Check your connection and try again.",
    )
  })
})
