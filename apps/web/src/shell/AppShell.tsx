import { Outlet } from 'react-router'
import { useUser } from '../auth/AuthContext'
import { SyncBadge } from '../components/SyncBadge'
import { Wordmark } from '../components/Wordmark'
import { BottomNav } from './BottomNav'
import { navItemsFor } from './navigation'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const user = useUser()
  const items = navItemsFor(user.role)
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[17rem_minmax(0,1fr)]">
      <Sidebar items={items} user={user} />
      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))] md:hidden">
          <Wordmark />
          <SyncBadge />
        </header>
        <main className="flex-1 px-5 pb-28 md:px-10 md:pb-10">
          <Outlet />
        </main>
        <BottomNav items={items.filter((item) => item.primary)} />
      </div>
    </div>
  )
}
