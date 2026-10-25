import type { Role } from './schemas'

export type Capability = 'TRACK_SADHANA' | 'VIEW_GROUP_REPORTS' | 'MANAGE_ROSTER' | 'EXPORT_REPORTS' | 'ADMINISTER'

const CONGREGATION: Capability[] = ['VIEW_GROUP_REPORTS', 'MANAGE_ROSTER', 'EXPORT_REPORTS']

const CAPABILITIES: Record<Role, Capability[]> = {
  DEVOTEE: ['TRACK_SADHANA'],
  COORDINATOR: ['TRACK_SADHANA', ...CONGREGATION],
  ADMIN: ['TRACK_SADHANA', ...CONGREGATION, 'ADMINISTER'],
}

export function hasCapability(role: Role, capability: Capability): boolean {
  return CAPABILITIES[role].includes(capability)
}
