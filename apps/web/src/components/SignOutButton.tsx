import { useState } from 'react'
import { useAuth, type SignOutScope } from '../auth/AuthContext'
import { useSync } from '../sync/SyncContext'

/** Signing out wipes this device, so entries still waiting to sync are only discarded after the devotee confirms. */
export function SignOutButton({ className, everywhereClassName }: { className: string; everywhereClassName: string }) {
  const { signOut } = useAuth()
  const { queue } = useSync()
  const [confirming, setConfirming] = useState<SignOutScope>()
  const count = queue.length
  const attempt = (scope: SignOutScope) => (count > 0 ? setConfirming(scope) : void signOut(scope))

  if (confirming && count > 0) {
    return (
      <div role="alertdialog" aria-label="Unsynced entries" className="rounded-xl border border-saffron/40 bg-saffron/8 p-3 text-xs text-ink">
        <p>
          {count === 1 ? "1 entry hasn't synced yet." : `${count} entries haven't synced yet.`} Signing out removes{' '}
          {count === 1 ? 'it' : 'them'} from this device.
        </p>
        <div className="mt-2 flex gap-4 font-semibold">
          <button type="button" onClick={() => void signOut(confirming)} className="text-saffron-text">
            Sign out anyway
          </button>
          <button type="button" onClick={() => setConfirming(undefined)} className="text-ink-muted">
            Stay signed in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={() => attempt('device')} className={className}>
        Sign out
      </button>
      <button type="button" onClick={() => attempt('everywhere')} className={everywhereClassName}>
        Sign out everywhere
      </button>
    </div>
  )
}
