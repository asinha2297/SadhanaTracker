import { zodResolver } from '@hookform/resolvers/zod'
import { RoleSchema } from '@sadhana/domain'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { createDevotee } from '../../api/accounts'
import { applyFieldIssues } from '../../api/client'
import { NewDevoteeSchema, type CreatedDevotee, type NewDevoteeInput } from '../../api/contract'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { FormAlert } from '../../components/FormAlert'
import { SelectField } from '../../components/SelectField'
import { TextField } from '../../components/TextField'
import { useT } from '../../i18n'
import { PasswordHandover } from './PasswordHandover'

type FormValues = z.input<typeof NewDevoteeSchema>

const blank = (): FormValues => ({ name: '', phone: '', email: '', role: 'DEVOTEE' })

/** Every account starts here, with a one-time password to hand over in person; only administrators may create leaders. */
export function NewDevoteeForm({ canCreateLeaders, onCreated }: { canCreateLeaders: boolean; onCreated: () => Promise<void> }) {
  const t = useT()
  const [created, setCreated] = useState<CreatedDevotee>()
  const [failure, setFailure] = useState<string>()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, NewDevoteeInput>({ resolver: zodResolver(NewDevoteeSchema), defaultValues: blank() })

  const submit = handleSubmit(async (input) => {
    setFailure(undefined)
    try {
      setCreated(await createDevotee(input))
      reset(blank())
      await onCreated()
    } catch (error) {
      if (!applyFieldIssues(error, (field, message) => setError(field as 'phone' | 'email', { message }))) {
        setFailure(t.masterAdmin.createFailed)
      }
    }
  })

  return (
    <Card>
      <h2 className="font-serif text-xl text-ink">{t.masterAdmin.addDevotee}</h2>
      <form onSubmit={submit} noValidate className="mt-3 grid gap-3 sm:grid-cols-3 sm:items-end">
        <TextField id="newName" label={t.masterAdmin.name} autoComplete="off" error={errors.name?.message} {...register('name')} />
        <TextField id="newPhone" label={t.masterAdmin.phone} type="tel" autoComplete="off" error={errors.phone?.message} {...register('phone')} />
        <TextField id="newEmail" label={t.masterAdmin.emailOptional} type="email" autoComplete="off" error={errors.email?.message} {...register('email')} />
        {canCreateLeaders && (
          <SelectField id="newRole" label={t.masterAdmin.role} error={errors.role?.message} {...register('role')}>
            {RoleSchema.options.map((role) => (
              <option key={role} value={role}>
                {t.roles[role]}
              </option>
            ))}
          </SelectField>
        )}
        <Button type="submit" disabled={isSubmitting} className="sm:mb-px sm:justify-self-start">
          {t.masterAdmin.createAccount}
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
