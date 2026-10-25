import { describe, expect, it } from 'vitest'
import { targetChoiceForm } from './targetForm'

const schema = targetChoiceForm('2026-10-24')
const personal = { kind: 'PERSONAL' as const, effectiveDate: '2026-10-24', rounds: 8, readingMinutes: 15, hearingMinutes: 15 }

describe('targetChoiceForm', () => {
  it('accepts today or later and rejects the past', () => {
    expect(schema.safeParse(personal).success).toBe(true)
    expect(schema.safeParse({ ...personal, effectiveDate: '2026-10-23' }).error?.issues[0]?.message).toBe(
      'Choose today or a later date',
    )
  })

  it('validates the numbers only for a personal target', () => {
    expect(schema.safeParse({ ...personal, rounds: Number.NaN, kind: 'RECOMMENDED' }).success).toBe(true)
    const result = schema.safeParse({ ...personal, rounds: Number.NaN, readingMinutes: -5 })
    expect(result.error?.issues.map((issue) => [issue.path[0], issue.message])).toEqual([
      ['rounds', 'Enter a number'],
      ['readingMinutes', "Can't be negative"],
    ])
  })
})
