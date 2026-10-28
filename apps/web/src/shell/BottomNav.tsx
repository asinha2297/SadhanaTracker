import { Ellipsis } from 'lucide-react'
import { motion } from 'motion/react'
import { NavLink } from 'react-router'
import { useT } from '../i18n'
import type { NavItem } from './navigation'

const more: Pick<NavItem, 'key' | 'to' | 'icon'> = { key: 'more', to: '/more', icon: Ellipsis }

export function BottomNav({ items }: { items: NavItem[] }) {
  const t = useT()
  return (
    <nav
      aria-label={t.nav.quick}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl md:hidden"
    >
      <ul className="grid grid-cols-5">
        {[...items, more].map(({ to, key, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-medium ${
                  isActive ? 'text-saffron-text' : 'text-ink-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="quick-nav-active" className="absolute top-0 h-0.5 w-7 rounded-full bg-saffron" />
                  )}
                  <Icon className="size-[22px]" aria-hidden />
                  {t.nav.items[key]}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
