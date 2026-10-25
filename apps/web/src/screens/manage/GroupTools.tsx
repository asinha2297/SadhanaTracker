import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { NewGroupSchema, type Group, type Member } from '../../api/contract'
import { addMember, approveMember, createGroup, devoteesQuery, removeMember } from '../../api/groups'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { FormAlert } from '../../components/FormAlert'
import { SelectField } from '../../components/SelectField'
import { TextField } from '../../components/TextField'
import { shortDate } from '../../lib/format'
import { SMALL_BUTTON, SMALL_PRIMARY } from './PasswordHandover'

const FAILED = "That didn't go through. Check your connection and try again."

export function CreateGroupForm({ onCreated }: { onCreated: (group: Group) => Promise<void> }) {
  const [failure, setFailure] = useState<string>()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string }>({ resolver: zodResolver(NewGroupSchema), defaultValues: { name: '' } })

  const submit = handleSubmit(async ({ name }) => {
    setFailure(undefined)
    try {
      const group = await createGroup(name)
      reset()
      await onCreated(group)
    } catch {
      setFailure(FAILED)
    }
  })

  return (
    <Card>
      <h2 className="font-serif text-xl text-ink">Create a group</h2>
      <form onSubmit={submit} noValidate className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextField id="groupName" label="New group name" error={errors.name?.message} {...register('name')} />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          Create group
        </Button>
      </form>
      <p className="mt-2 text-xs text-ink-muted">
        You become its coordinator. Individual record review stays off until an administrator grants it.
      </p>
      <FormAlert message={failure} />
    </Card>
  )
}

export function AddMemberForm({ groupId, groups, onAdded }: { groupId: string; groups: Group[]; onAdded: () => Promise<void> }) {
  const devotees = useQuery(devoteesQuery)
  const [devoteeId, setDevoteeId] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string>()
  const groupName = (id: string | null) => groups.find((group) => group.id === id)?.name ?? 'another group'
  const candidates = (devotees.data ?? []).filter((candidate) => candidate.groupId !== groupId)

  const add = async () => {
    setBusy(true)
    setFailure(undefined)
    try {
      await addMember(groupId, devoteeId)
      setDevoteeId('')
      await onAdded()
    } catch {
      setFailure(FAILED)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <h2 className="font-serif text-xl text-ink">Add to this group</h2>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <SelectField
            id="addDevotee"
            label="Add existing devotee"
            value={devoteeId}
            onChange={(event) => setDevoteeId(event.target.value)}
          >
            <option value="">Select a devotee…</option>
            {candidates.map((candidate) => (
              <option key={candidate.devoteeId} value={candidate.devoteeId}>
                {candidate.name} ({candidate.devoteeId}) · {candidate.groupId ? groupName(candidate.groupId) : 'no group'}
              </option>
            ))}
          </SelectField>
        </div>
        <Button type="button" disabled={!devoteeId || busy} onClick={() => void add()}>
          Add to group
        </Button>
      </div>
      <p className="mt-2 text-xs text-ink-muted">Moving a devotee here removes them from their previous group.</p>
      <FormAlert message={failure} />
    </Card>
  )
}

export function JoinRequests({
  groupId,
  requests,
  onChanged,
}: {
  groupId: string
  requests: Member[]
  onChanged: () => Promise<void>
}) {
  const [failure, setFailure] = useState<string>()

  const act = async (work: () => Promise<void>) => {
    setFailure(undefined)
    try {
      await work()
      await onChanged()
    } catch {
      setFailure(FAILED)
    }
  }

  return (
    <Card aria-label="Join requests">
      <h2 className="font-serif text-xl text-ink">Join requests</h2>
      <p className="mt-1 text-xs text-ink-muted">Devotees who signed up and chose this group. Approving lets them sign in.</p>
      <ul className="mt-3 divide-y divide-line">
        {requests.map((request) => (
          <li key={request.devoteeId} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
            <span>
              <span className="font-medium text-ink">{request.name}</span>
              <span className="text-ink-muted">
                {' '}
                · {request.devoteeId} · asked {shortDate(request.joinedAt)}
              </span>
            </span>
            <span className="flex gap-2">
              <button type="button" onClick={() => void act(() => approveMember(groupId, request.devoteeId))} className={SMALL_PRIMARY}>
                Approve
              </button>
              <button type="button" onClick={() => void act(() => removeMember(groupId, request.devoteeId))} className={SMALL_BUTTON}>
                Decline
              </button>
            </span>
          </li>
        ))}
      </ul>
      <FormAlert message={failure} />
    </Card>
  )
}
