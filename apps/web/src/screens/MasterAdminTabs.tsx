import { NavLink } from 'react-router'
import { useT } from '../i18n'

const TABS = [
  { to: '/master-admin', key: 'devoteesTab', end: true },
  { to: '/master-admin/library', key: 'libraryTab', end: false },
] as const

/** The two halves of Master admin: the people, and the library they record against. */
export function MasterAdminTabs() {
  const t = useT()
  return (
    <nav aria-label={t.nav.items.masterAdmin} className="flex gap-2">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              isActive ? 'bg-saffron/10 text-saffron-text' : 'text-ink-muted hover:bg-peacock/8 hover:text-peacock'
            }`
          }
        >
          {t.masterAdmin[tab.key]}
        </NavLink>
      ))}
    </nav>
  )
}
