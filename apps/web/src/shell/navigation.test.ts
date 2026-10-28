import type { Role } from '@sadhana/domain'
import { describe, expect, it } from 'vitest'
import { navItemsFor } from './navigation'

const keys = (role: Role) => navItemsFor(role).map((item) => item.key)

describe('navItemsFor', () => {
  it('gives a devotee only personal screens and help', () => {
    expect(keys('DEVOTEE')).toEqual(['today', 'record', 'week', 'history', 'profile', 'reminders', 'help'])
  })

  it('adds the report, master admin and export for a coordinator, and administration only for an admin', () => {
    expect(keys('COORDINATOR')).toEqual(expect.arrayContaining(['report', 'masterAdmin', 'export']))
    expect(keys('COORDINATOR')).not.toContain('administration')
    expect(keys('ADMIN')).toEqual(expect.arrayContaining(['report', 'masterAdmin', 'export', 'administration']))
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
