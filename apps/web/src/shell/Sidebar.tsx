import { NavLink } from 'react-router'
import type { SessionUser } from '../auth/session'
import { SignOutButton } from '../components/SignOutButton'
import { SyncBadge } from '../components/SyncBadge'
import { Wordmark } from '../components/Wordmark'
import { ROLE_LABELS } from '../lib/roles'
import type { NavItem, NavSection } from './navigation'

const groupBySection = (items: NavItem[]) =>
  items.reduce((sections, item) => {
    sections.set(item.section, [...(sections.get(item.section) ?? []), item])
    return sections
  }, new Map<NavSection, NavItem[]>())

export function Sidebar({ items, user }: { items: NavItem[]; user: SessionUser }) {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-card/60 px-4 py-7 backdrop-blur-2xl md:flex">
      <div className="px-3">
        <Wordmark tagline={false} />
      </div>
      <nav aria-label="Main navigation" className="mt-9 flex-1 space-y-7 overflow-y-auto">
        {[...groupBySection(items)].map(([section, sectionItems]) => (
          <div key={section}>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{section}</p>
            <ul className="mt-2 space-y-0.5">
              {sectionItems.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        isActive ? 'bg-saffron/10 text-saffron-text' : 'text-ink-muted hover:bg-peacock/8 hover:text-peacock'
                      }`
                    }
                  >
                    <Icon className="size-[18px]" aria-hidden />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <footer className="border-t border-line px-3 pt-4 text-sm">
        <div className="mb-3">
          <SyncBadge />
        </div>
        <p className="font-medium text-ink">{user.name}</p>
        <p className="text-xs text-ink-muted">{ROLE_LABELS[user.role]}</p>
        <div className="mt-3">
          <SignOutButton
            className="text-left text-xs font-medium text-ink-muted transition-colors hover:text-peacock"
            everywhereClassName="text-left text-xs text-ink-muted transition-colors hover:text-peacock"
          />
        </div>
      </footer>
    </aside>
  )
}
