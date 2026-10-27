import type { Role } from '@sadhana/domain'
import { describe, expect, it } from 'vitest'
import { navItemsFor } from './navigation'

const labels = (role: Role) => navItemsFor(role).map((item) => item.label)

describe('navItemsFor', () => {
  it('gives a devotee only personal screens and help', () => {
    expect(labels('DEVOTEE')).toEqual([
      'Today',
      'Record',
      'Week',
      'History',
      'Profile & targets',
      'Reminders',
      'Help & privacy',
    ])
  })

  it('adds the report, master admin and export for a coordinator, and administration only for an admin', () => {
    expect(labels('COORDINATOR')).toEqual(expect.arrayContaining(['Report', 'Master admin', 'Export']))
    expect(labels('COORDINATOR')).not.toContain('Administration')
    expect(labels('ADMIN')).toEqual(expect.arrayContaining(['Report', 'Master admin', 'Export', 'Administration']))
  })

  it('marks exactly the four thumb-zone screens as primary', () => {
    expect(navItemsFor('ADMIN').filter((item) => item.primary).map((item) => item.to)).toEqual([
      '/',
      '/entry',
      '/week',
      '/history',
    ])
  })
})
