import { zodResolver } from '@hookform/resolvers/zod'
import { RoleSchema } from '@sadhana/domain'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { createDevotee } from '../../api/admin'
import { applyFieldIssues } from '../../api/client'
import { NewDevoteeSchema, type CreatedDevotee, type Group, type NewDevoteeInput } from '../../api/contract'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { FormAlert } from '../../components/FormAlert'
import { SelectField } from '../../components/SelectField'
import { TextField } from '../../components/TextField'
import { ROLE_LABELS } from '../../lib/roles'
import { PasswordHandover } from './PasswordHandover'

const blank = (groupId: string | null): NewDevoteeInput => ({ name: '', role: 'DEVOTEE', groupId, phone: '', email: '' })

export function NewDevoteeForm({
  groups,
  defaultGroupId,
  onCreated,
}: {
  groups: Group[]
  defaultGroupId: string
  onCreated: () => Promise<void>
}) {
  const [created, setCreated] = useState<CreatedDevotee>()
  const [failure, setFailure] = useState<string>()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewDevoteeInput>({ resolver: zodResolver(NewDevoteeSchema), defaultValues: blank(defaultGroupId) })

  const submit = handleSubmit(async (input) => {
    setFailure(undefined)
    try {
      setCreated(await createDevotee(input))
      reset(blank(input.groupId))
      await onCreated()
    } catch (error) {
      if (!applyFieldIssues(error, (field, message) => setError(field as 'phone' | 'email', { message }))) {
        setFailure("We couldn't create the account. Check your connection and try again.")
      }
    }
  })

  return (
    <Card>
      <h2 className="font-serif text-xl text-ink">Add a devotee</h2>
      <form onSubmit={submit} noValidate className="mt-3 grid gap-3 sm:grid-cols-3 sm:items-end">
        <TextField id="newName" label="Name" autoComplete="off" error={errors.name?.message} {...register('name')} />
        <TextField id="newPhone" label="Mobile number" type="tel" autoComplete="off" error={errors.phone?.message} {...register('phone')} />
        <TextField id="newEmail" label="Email (optional)" type="email" autoComplete="off" error={errors.email?.message} {...register('email')} />
        <SelectField id="newRole" label="Role" error={errors.role?.message} {...register('role')}>
          {RoleSchema.options.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </SelectField>
        <SelectField
          id="newGroup"
          label="Assign to group"
          error={errors.groupId?.message}
          {...register('groupId', { setValueAs: (value: string) => value || null })}
        >
          <option value="">No group</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </SelectField>
        <Button type="submit" disabled={isSubmitting} className="sm:mb-px sm:justify-self-start">
          Create account
        </Button>
      </form>
      <div className="mt-3 space-y-3">
        <FormAlert message={failure} />
        {created && (
          <PasswordHandover
            handover={{ name: created.devotee.name, phone: created.devotee.phone, password: created.temporaryPassword }}
            onDone={() => setCreated(undefined)}
          />
        )}
      </div>
    </Card>
  )
}
