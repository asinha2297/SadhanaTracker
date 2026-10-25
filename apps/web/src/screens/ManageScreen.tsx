import { hasCapability, RoleSchema } from '@sadhana/domain'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { issuePassword, patchDevotee } from '../api/admin'
import type { Group, Member } from '../api/contract'
import { groupsQuery, membersQuery, removeMember } from '../api/groups'
import { useUser } from '../auth/AuthContext'
import { Card } from '../components/Card'
import { FormAlert } from '../components/FormAlert'
import { GroupSelect } from '../components/GroupSelect'
import { PageHeader } from '../components/PageHeader'
import { ScreenError, ScreenLoading } from '../components/ScreenState'
import { shortDate } from '../lib/format'
import { ROLE_LABELS } from '../lib/roles'
import { AddMemberForm, CreateGroupForm, JoinRequests } from './manage/GroupTools'
import { NewDevoteeForm } from './manage/NewDevoteeForm'
import { PasswordHandover, SMALL_BUTTON, SMALL_PRIMARY, type Handover } from './manage/PasswordHandover'
import { ResetRequests } from './manage/ResetRequests'

export function ManageScreen() {
  const user = useUser()
  const groups = useQuery(groupsQuery)
  if (groups.isError) return <ScreenError onRetry={() => void groups.refetch()} />
  if (groups.isPending) return <ScreenLoading />
  return <Roster groups={groups.data} firstGroupId={groups.data[0]?.id ?? ''} isAdmin={hasCapability(user.role, 'ADMINISTER')} />
}

function Roster({ groups, firstGroupId, isAdmin }: { groups: Group[]; firstGroupId: string; isAdmin: boolean }) {
  const queryClient = useQueryClient()
  const [groupId, setGroupId] = useState(firstGroupId)
  const [handover, setHandover] = useState<Handover>()
  const [failure, setFailure] = useState<string>()
  const members = useQuery({ ...membersQuery(groupId), enabled: groupId !== '' })

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['groups'] }),
      queryClient.invalidateQueries({ queryKey: ['devotees'] }),
    ])
  }

  const act = async (work: () => Promise<void>) => {
    setFailure(undefined)
    try {
      await work()
      await refresh()
    } catch {
      setFailure("That change didn't go through. Check your connection and try again.")
    }
  }

  const roster = members.data?.filter((member) => !member.pending) ?? []
  const requests = members.data?.filter((member) => member.pending) ?? []

  return (
    <div className="mx-auto max-w-5xl space-y-5 py-6 md:py-10">
      <PageHeader
        title="Devotees & groups"
        subtitle={isAdmin ? 'Accounts, roles and groups across the congregation.' : 'Your groups and the devotees in them.'}
      >
        {groups.length > 0 && <GroupSelect groups={groups} value={groupId} onChange={setGroupId} />}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <CreateGroupForm
          onCreated={async (group) => {
            await refresh()
            setGroupId(group.id)
          }}
        />
        {groupId && <AddMemberForm groupId={groupId} groups={groups} onAdded={refresh} />}
      </div>

      {requests.length > 0 && <JoinRequests groupId={groupId} requests={requests} onChanged={refresh} />}
      {isAdmin && <ResetRequests />}
      {isAdmin && <NewDevoteeForm groups={groups} defaultGroupId={groupId} onCreated={refresh} />}

      <FormAlert message={failure} />
      {handover && <PasswordHandover handover={handover} onDone={() => setHandover(undefined)} />}

      {!groupId ? (
        <p className="py-10 text-center text-sm text-ink-muted">Create a group to start building your roster.</p>
      ) : members.isError ? (
        <ScreenError onRetry={() => void members.refetch()} />
      ) : members.isPending ? (
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
              {roster.map((member) => (
                <tr key={member.devoteeId} className="border-t border-line">
                  <td className="px-4 py-3">
                    <NameCell
                      member={member}
                      isAdmin={isAdmin}
                      onRename={(name) =>
                        act(async () => {
                          await patchDevotee(member.devoteeId, { name })
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    {isAdmin ? (
                      <select
                        aria-label={`Role of ${member.name}`}
                        value={member.role}
                        onChange={(event) =>
                          void act(async () => {
                            await patchDevotee(member.devoteeId, { role: RoleSchema.parse(event.target.value) })
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
                      <span className="text-ink">{ROLE_LABELS[member.role]}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-ink-muted">{shortDate(member.joinedAt)}</td>
                  <td className="px-3 py-3">
                    <span className={member.active ? 'font-medium text-peacock-text' : 'text-ink-muted'}>
                      {member.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              void act(async () => {
                                await patchDevotee(member.devoteeId, { active: !member.active })
                              })
                            }
                            className={SMALL_BUTTON}
                          >
                            {member.active ? 'Deactivate' : 'Reactivate'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void act(async () => {
                                setHandover({ name: member.name, password: await issuePassword(member.devoteeId) })
                              })
                            }
                            className={SMALL_BUTTON}
                          >
                            Issue one-time password
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => void act(() => removeMember(groupId, member.devoteeId))}
                        className={SMALL_BUTTON}
                      >
                        Remove from group
                      </button>
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
function NameCell({ member, isAdmin, onRename }: { member: Member; isAdmin: boolean; onRename: (name: string) => Promise<void> }) {
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
      <span className="font-medium text-ink">{member.name}</span>
      {isAdmin && (
        <button type="button" onClick={() => setDraft(member.name)} className="ml-2 text-xs font-semibold text-saffron-text">
          Rename
        </button>
      )}
      <span className="block text-xs text-ink-muted">{member.devoteeId}</span>
    </>
  )
}
