import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { useUser } from '../auth/AuthContext'
import { LanguageToggle } from '../components/LanguageToggle'
import { SignOutButton } from '../components/SignOutButton'
import { useT } from '../i18n'
import { navItemsFor } from '../shell/navigation'

export function MoreScreen() {
  const user = useUser()
  const t = useT()
  const items = navItemsFor(user.role).filter((item) => !item.primary)
  return (
    <section className="py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">{t.nav.items.more}</h1>
          <p className="mt-1 text-sm text-ink-muted">{user.name}</p>
        </div>
        <LanguageToggle />
      </div>
      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-card">
        {items.map(({ to, key, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-4 px-4 py-3.5 text-sm font-medium text-ink">
              <Icon className="size-5 text-saffron" aria-hidden />
              <span className="flex-1">{t.nav.items[key]}</span>
              <ChevronRight className="size-4 text-ink-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <SignOutButton
          className="w-full rounded-2xl bg-card px-4 py-3.5 text-sm font-medium text-ink-muted shadow-card"
          everywhereClassName="w-full py-2 text-center text-xs font-medium text-ink-muted"
        />
      </div>
    </section>
  )
}
