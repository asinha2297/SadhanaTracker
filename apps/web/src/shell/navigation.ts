import { hasCapability, type Capability, type Role } from '@sadhana/domain'
import {
  BellRing,
  CalendarDays,
  Download,
  History,
  LifeBuoy,
  NotebookPen,
  ShieldCheck,
  Sunrise,
  UserRound,
  UserRoundPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Dictionary } from '../i18n/en'

export type NavKey = keyof Dictionary['nav']['items']
export type NavSection = keyof Dictionary['nav']['sections']

export interface NavItem {
  /** Looked up in the dictionary's nav.items, so the label follows the language. */
  key: NavKey
  to: string
  icon: LucideIcon
  section: NavSection
  capability: Capability
  primary?: true
}

const NAV_ITEMS: NavItem[] = [
  { key: 'today', to: '/', icon: Sunrise, section: 'sadhana', capability: 'TRACK_SADHANA', primary: true },
  { key: 'record', to: '/entry', icon: NotebookPen, section: 'sadhana', capability: 'TRACK_SADHANA', primary: true },
  { key: 'week', to: '/week', icon: CalendarDays, section: 'sadhana', capability: 'TRACK_SADHANA', primary: true },
  { key: 'history', to: '/history', icon: History, section: 'sadhana', capability: 'TRACK_SADHANA', primary: true },
  { key: 'profile', to: '/profile', icon: UserRound, section: 'sadhana', capability: 'TRACK_SADHANA' },
  { key: 'reminders', to: '/reminders', icon: BellRing, section: 'sadhana', capability: 'TRACK_SADHANA' },
  { key: 'report', to: '/report', icon: Users, section: 'congregation', capability: 'VIEW_REPORTS' },
  { key: 'masterAdmin', to: '/master-admin', icon: UserRoundPlus, section: 'congregation', capability: 'MANAGE_ACCOUNTS' },
  { key: 'export', to: '/export', icon: Download, section: 'congregation', capability: 'EXPORT_REPORTS' },
  { key: 'administration', to: '/admin', icon: ShieldCheck, section: 'administration', capability: 'ADMINISTER' },
  { key: 'help', to: '/help', icon: LifeBuoy, section: 'support', capability: 'TRACK_SADHANA' },
]

export function navItemsFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => hasCapability(role, item.capability))
}
