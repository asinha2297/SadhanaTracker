import { describe, expect, it } from 'vitest'
import { isEditable } from './editable'

const today = '2026-10-24'

describe('isEditable', () => {
  it('allows today and the six days before it', () => {
    expect(isEditable('2026-10-24', today)).toBe(true)
    expect(isEditable('2026-10-18', today)).toBe(true)
  })

  it('locks older days and future days', () => {
    expect(isEditable('2026-10-17', today)).toBe(false)
    expect(isEditable('2026-10-25', today)).toBe(false)
  })
})
