import type { DayStatus } from '@sadhana/domain'
import type { Reminders } from '../api/contract'
import { localTimeIn } from './clock'

export function isReminderDue(reminders: Reminders, now: Date, today: DayStatus): boolean {
  return reminders.enabled && today === 'MISSING' && localTimeIn(reminders.timeZone, now) >= reminders.time
}
