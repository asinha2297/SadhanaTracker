import { describe, expect, it } from 'vitest'
import { hasCapability } from './permissions'

describe('hasCapability', () => {
  it('lets every role track their own sadhana', () => {
    expect(hasCapability('DEVOTEE', 'TRACK_SADHANA')).toBe(true)
    expect(hasCapability('COORDINATOR', 'TRACK_SADHANA')).toBe(true)
    expect(hasCapability('ADMIN', 'TRACK_SADHANA')).toBe(true)
  })

  it('reserves group reports, roster and export for coordinators and admins', () => {
    for (const capability of ['VIEW_GROUP_REPORTS', 'MANAGE_ROSTER', 'EXPORT_REPORTS'] as const) {
      expect(hasCapability('DEVOTEE', capability)).toBe(false)
      expect(hasCapability('COORDINATOR', capability)).toBe(true)
      expect(hasCapability('ADMIN', capability)).toBe(true)
    }
  })

  it('reserves administration for admins', () => {
    expect(hasCapability('DEVOTEE', 'ADMINISTER')).toBe(false)
    expect(hasCapability('COORDINATOR', 'ADMINISTER')).toBe(false)
    expect(hasCapability('ADMIN', 'ADMINISTER')).toBe(true)
  })
})
