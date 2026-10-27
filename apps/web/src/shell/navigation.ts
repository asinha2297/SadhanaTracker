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

export type NavSection = 'Your sadhana' | 'Congregation' | 'Administration' | 'Support'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  section: NavSection
  capability: Capability
  primary?: true
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Today', to: '/', icon: Sunrise, section: 'Your sadhana', capability: 'TRACK_SADHANA', primary: true },
  { label: 'Record', to: '/entry', icon: NotebookPen, section: 'Your sadhana', capability: 'TRACK_SADHANA', primary: true },
  { label: 'Week', to: '/week', icon: CalendarDays, section: 'Your sadhana', capability: 'TRACK_SADHANA', primary: true },
  { label: 'History', to: '/history', icon: History, section: 'Your sadhana', capability: 'TRACK_SADHANA', primary: true },
  { label: 'Profile & targets', to: '/profile', icon: UserRound, section: 'Your sadhana', capability: 'TRACK_SADHANA' },
  { label: 'Reminders', to: '/reminders', icon: BellRing, section: 'Your sadhana', capability: 'TRACK_SADHANA' },
  { label: 'Report', to: '/report', icon: Users, section: 'Congregation', capability: 'VIEW_REPORTS' },
  { label: 'Master admin', to: '/master-admin', icon: UserRoundPlus, section: 'Congregation', capability: 'MANAGE_ACCOUNTS' },
  { label: 'Export', to: '/export', icon: Download, section: 'Congregation', capability: 'EXPORT_REPORTS' },
  { label: 'Administration', to: '/admin', icon: ShieldCheck, section: 'Administration', capability: 'ADMINISTER' },
  { label: 'Help & privacy', to: '/help', icon: LifeBuoy, section: 'Support', capability: 'TRACK_SADHANA' },
]

export function navItemsFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => hasCapability(role, item.capability))
}
