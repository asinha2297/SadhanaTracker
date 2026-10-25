import { Ellipsis } from 'lucide-react'
import { motion } from 'motion/react'
import { NavLink } from 'react-router'
import type { NavItem } from './navigation'

const more: Pick<NavItem, 'label' | 'to' | 'icon'> = { label: 'More', to: '/more', icon: Ellipsis }

export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl md:hidden"
    >
      <ul className="grid grid-cols-5">
        {[...items, more].map(({ to, label, icon: Icon }) => (
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
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
