import { describe, expect, it } from 'vitest'
import { resolveTarget, type TargetHistory } from './targets'

const standard = { rounds: 16, readingMinutes: 30, hearingMinutes: 30 }
const raised = { rounds: 16, readingMinutes: 45, hearingMinutes: 45 }
const personal = { rounds: 8, readingMinutes: 15, hearingMinutes: 15 }

const recommended = [
  { effectiveDate: '2026-01-01', target: standard },
  { effectiveDate: '2026-10-20', target: raised },
]

describe('resolveTarget', () => {
  it('follows the recommended target when the devotee has made no choice', () => {
    expect(resolveTarget({ recommended, personal: [] }, '2026-10-24')).toEqual(raised)
  })

  it('keeps history immutable: a later change never rewrites earlier dates', () => {
    expect(resolveTarget({ recommended, personal: [] }, '2026-10-19')).toEqual(standard)
    expect(resolveTarget({ recommended, personal: [] }, '2026-10-20')).toEqual(raised)
  })

  it('is undefined before any target existed', () => {
    expect(resolveTarget({ recommended, personal: [] }, '2025-12-31')).toBeUndefined()
  })

  it('uses a personal target from its effective date onward', () => {
    const history: TargetHistory = {
      recommended,
      personal: [{ effectiveDate: '2026-10-10', kind: 'PERSONAL', target: personal }],
    }
    expect(resolveTarget(history, '2026-10-09')).toEqual(standard)
    expect(resolveTarget(history, '2026-10-10')).toEqual(personal)
    expect(resolveTarget(history, '2026-10-24')).toEqual(personal)
  })

  it('re-adopting the recommended target follows later recommended changes', () => {
    const history: TargetHistory = {
      recommended,
      personal: [
        { effectiveDate: '2026-10-10', kind: 'PERSONAL', target: personal },
        { effectiveDate: '2026-10-15', kind: 'RECOMMENDED' },
      ],
    }
    expect(resolveTarget(history, '2026-10-14')).toEqual(personal)
    expect(resolveTarget(history, '2026-10-15')).toEqual(standard)
    expect(resolveTarget(history, '2026-10-24')).toEqual(raised)
  })

  it('does not depend on the order history is supplied in', () => {
    expect(resolveTarget({ recommended: [...recommended].reverse(), personal: [] }, '2026-10-24')).toEqual(raised)
  })

  it('lets the most recently recorded change win when two share an effective date', () => {
    const corrected = { rounds: 16, readingMinutes: 60, hearingMinutes: 30 }
    const history: TargetHistory = {
      recommended: [...recommended, { effectiveDate: '2026-10-20', target: corrected }],
      personal: [],
    }
    expect(resolveTarget(history, '2026-10-24')).toEqual(corrected)
  })
})
