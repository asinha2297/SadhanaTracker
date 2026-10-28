import { useState } from 'react'
import { useAuth, type SignOutScope } from '../auth/AuthContext'
import { useT } from '../i18n'
import { useSync } from '../sync/SyncContext'

/** Signing out wipes this device, so entries still waiting to sync are only discarded after the devotee confirms. */
export function SignOutButton({ className, everywhereClassName }: { className: string; everywhereClassName: string }) {
  const { signOut } = useAuth()
  const { queue } = useSync()
  const t = useT()
  const [confirming, setConfirming] = useState<SignOutScope>()
  const count = queue.length
  const attempt = (scope: SignOutScope) => (count > 0 ? setConfirming(scope) : void signOut(scope))

  if (confirming && count > 0) {
    return (
      <div role="alertdialog" aria-label={t.signOut.unsyncedTitle} className="rounded-xl border border-saffron/40 bg-saffron/8 p-3 text-xs text-ink">
        <p>{t.signOut.unsynced(count)}</p>
        <div className="mt-2 flex gap-4 font-semibold">
          <button type="button" onClick={() => void signOut(confirming)} className="text-saffron-text">
            {t.signOut.anyway}
          </button>
          <button type="button" onClick={() => setConfirming(undefined)} className="text-ink-muted">
            {t.signOut.stay}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={() => attempt('device')} className={className}>
        {t.signOut.signOut}
      </button>
      <button type="button" onClick={() => attempt('everywhere')} className={everywhereClassName}>
        {t.signOut.everywhere}
      </button>
    </div>
  )
}
