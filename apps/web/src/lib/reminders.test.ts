import { describe, expect, it } from 'vitest'
import { isReminderDue } from './reminders'

const reminders = { enabled: true, time: '21:00', timeZone: 'Asia/Kolkata', channel: 'IN_APP' as const }
const at = (iso: string) => new Date(iso)

describe('isReminderDue', () => {
  it('is due once the chosen local time has passed and today is still missing', () => {
    expect(isReminderDue(reminders, at('2026-10-24T15:30:00Z'), 'MISSING')).toBe(true)
    expect(isReminderDue(reminders, at('2026-10-24T15:29:00Z'), 'MISSING')).toBe(false)
  })

  it('stays quiet once today is recorded, even as a zero day, or when reminders are off', () => {
    expect(isReminderDue(reminders, at('2026-10-24T16:00:00Z'), 'RECORDED')).toBe(false)
    expect(isReminderDue(reminders, at('2026-10-24T16:00:00Z'), 'ZERO_ENTRY')).toBe(false)
    expect(isReminderDue({ ...reminders, enabled: false }, at('2026-10-24T16:00:00Z'), 'MISSING')).toBe(false)
  })
})
