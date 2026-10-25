import { DrizzleQueryError } from 'drizzle-orm/errors'
import { describe, expect, it } from 'vitest'
import { describeError } from './errors'

describe('describeError', () => {
  it('keeps query parameters, which may hold reflections and contact details, out of the log', () => {
    const cause = Object.assign(new Error('duplicate key value violates unique constraint "accounts_phone_idx"'), {
      detail: 'Key (phone)=(+919876543210) already exists.',
    })
    const error = new DrizzleQueryError('insert into "entries" ("reflection") values ($1)', ['Chanting felt focused today.'], cause)
    const described = describeError(error)
    expect(described).toMatchObject({
      name: 'DrizzleQueryError',
      message: 'Failed query: insert into "entries" ("reflection") values ($1)',
      cause: 'Error: duplicate key value violates unique constraint "accounts_phone_idx"',
    })
    expect(described.stack).toMatch(/^\s+at /)
    const text = JSON.stringify(described)
    expect(text).not.toContain('Chanting')
    expect(text).not.toContain('+919876543210')
  })

  it('describes ordinary errors and non-errors', () => {
    expect(describeError(new RangeError('boom'))).toMatchObject({ name: 'RangeError', message: 'boom' })
    expect(describeError('what')).toEqual({ name: 'Error', message: 'what' })
  })
})
