import { hasCapability, RoleSchema } from '@sadhana/domain'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { accountsQuery, issuePassword, patchDevotee } from '../api/accounts'
import type { Account } from '../api/contract'
import { useUser } from '../auth/AuthContext'
import { Card } from '../components/Card'
import { FormAlert } from '../components/FormAlert'
import { PageHeader } from '../components/PageHeader'
import { ScreenError, ScreenLoading } from '../components/ScreenState'
import { shortDate } from '../lib/format'
import { ROLE_LABELS } from '../lib/roles'
import { NewDevoteeForm } from './accounts/NewDevoteeForm'
import { PasswordHandover, SMALL_BUTTON, SMALL_PRIMARY, type Handover } from './accounts/PasswordHandover'
import { ResetRequests } from './accounts/ResetRequests'

export function MasterAdminScreen() {
  const user = useUser()
  const isAdmin = hasCapability(user.role, 'ADMINISTER')
  const queryClient = useQueryClient()
  const accounts = useQuery(accountsQuery)
  const [handover, setHandover] = useState<Handover>()
  const [failure, setFailure] = useState<string>()

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['accounts'] })
  const act = async (work: () => Promise<void>) => {
    setFailure(undefined)
    try {
      await work()
      await refresh()
    } catch {
      setFailure("That change didn't go through. Check your connection and try again.")
    }
  }
  // Coordinators look after devotees; only administrators touch other coordinators and administrators.
  const inCare = (account: Account) => isAdmin || account.role === 'DEVOTEE'

  return (
    <div className="mx-auto max-w-5xl space-y-5 py-6 md:py-10">
      <PageHeader title="Master admin" subtitle="Create devotee accounts and hand over their first password in person." />
      <NewDevoteeForm canCreateLeaders={isAdmin} onCreated={refresh} />
      <ResetRequests />
      <FormAlert message={failure} />
      {handover && <PasswordHandover handover={handover} onDone={() => setHandover(undefined)} />}

      {accounts.isError ? (
        <ScreenError onRetry={() => void accounts.refetch()} />
      ) : accounts.isPending ? (
        <ScreenLoading />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
                <th className="px-4 py-3 font-semibold">Devotee</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold">Joined</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.data.map((account) => (
                <tr key={account.devoteeId} className="border-t border-line">
                  <td className="px-4 py-3">
                    <NameCell
                      account={account}
                      isAdmin={isAdmin}
                      onRename={(name) =>
                        act(async () => {
                          await patchDevotee(account.devoteeId, { name })
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    {isAdmin ? (
                      <select
                        aria-label={`Role of ${account.name}`}
                        value={account.role}
                        onChange={(event) =>
                          void act(async () => {
                            await patchDevotee(account.devoteeId, { role: RoleSchema.parse(event.target.value) })
                          })
                        }
                        className="rounded-lg border border-line bg-card px-2 py-1 text-sm text-ink"
                      >
                        {RoleSchema.options.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-ink">{ROLE_LABELS[account.role]}</span>
                    )}
                    {isAdmin && account.role === 'COORDINATOR' && (
                      <label className="mt-1.5 flex items-center gap-2 text-xs text-ink-muted">
                        <input
                          type="checkbox"
                          aria-label={`Record review for ${account.name}`}
                          checked={account.canReviewRecords}
                          onChange={(event) =>
                            void act(async () => {
                              await patchDevotee(account.devoteeId, { canReviewRecords: event.target.checked })
                            })
                          }
                          className="accent-saffron"
                        />
                        Record review
                      </label>
                    )}
                  </td>
                  <td className="px-3 py-3 text-ink-muted">{shortDate(account.joinedAt)}</td>
                  <td className="px-3 py-3">
                    <span className={account.active ? 'font-medium text-tulasi' : 'text-ink-muted'}>
                      {account.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() =>
                            void act(async () => {
                              await patchDevotee(account.devoteeId, { active: !account.active })
                            })
                          }
                          className={SMALL_BUTTON}
                        >
                          {account.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                      {inCare(account) && (
                        <button
                          type="button"
                          onClick={() =>
                            void act(async () => {
                              setHandover({ name: account.name, phone: account.phone, password: await issuePassword(account.devoteeId) })
                            })
                          }
                          className={SMALL_BUTTON}
                        >
                          Issue one-time password
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

/** Names are the congregation's to keep: only administrators change them, and the ID always shows beside them. */
function NameCell({ account, isAdmin, onRename }: { account: Account; isAdmin: boolean; onRename: (name: string) => Promise<void> }) {
  const [draft, setDraft] = useState<string>()
  if (draft !== undefined) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onRename(draft).then(() => setDraft(undefined))
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          aria-label="New name"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="rounded-lg border border-line bg-card px-2 py-1 text-sm text-ink"
        />
        <button type="submit" className={SMALL_PRIMARY}>
          Save name
        </button>
        <button type="button" onClick={() => setDraft(undefined)} className={SMALL_BUTTON}>
          Cancel
        </button>
      </form>
    )
  }
  return (
    <>
      <span className="font-medium text-ink">{account.name}</span>
      {isAdmin && (
        <button type="button" onClick={() => setDraft(account.name)} className="ml-2 text-xs font-semibold text-saffron-text">
          Rename
        </button>
      )}
      <span className="block text-xs text-ink-muted">{account.devoteeId}</span>
    </>
  )
}
