import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { RemindersSchema, type Reminders } from '../api/contract'
import { putReminders, remindersQuery } from '../api/me'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { FormAlert } from '../components/FormAlert'
import { PageHeader } from '../components/PageHeader'
import { ScreenError, ScreenLoading } from '../components/ScreenState'
import { EYEBROW } from '../components/styles'
import { TextField } from '../components/TextField'
import { useT } from '../i18n'
import { deviceTimeZone } from '../lib/clock'

const ZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Sydney',
]

export function RemindersScreen() {
  const t = useT()
  const reminders = useQuery(remindersQuery)
  if (reminders.isError) return <ScreenError onRetry={() => void reminders.refetch()} />
  if (reminders.isPending) return <ScreenLoading />
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6 md:py-10">
      <PageHeader title={t.reminders.title} subtitle={t.reminders.subtitle} />
      <RemindersForm reminders={reminders.data} />
    </div>
  )
}

function RemindersForm({ reminders }: { reminders: Reminders }) {
  const t = useT()
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)
  const [failure, setFailure] = useState<string>()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Reminders>({ resolver: zodResolver(RemindersSchema), defaultValues: reminders })
  const enabled = useWatch({ control, name: 'enabled' })
  const zones = [...new Set([deviceTimeZone(), ...ZONES])]

  const submit = handleSubmit(async (input) => {
    setSaved(false)
    setFailure(undefined)
    try {
      queryClient.setQueryData(remindersQuery.queryKey, await putReminders(input))
      setSaved(true)
    } catch {
      setFailure(t.reminders.failed)
    }
  })

  return (
    <Card>
      <form onSubmit={submit} noValidate className="space-y-5">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block font-medium text-ink">{t.reminders.remindMe}</span>
            <span className="block text-sm text-ink-muted">{t.reminders.remindHint}</span>
          </span>
          <input type="checkbox" className="size-5 shrink-0 accent-saffron" {...register('enabled')} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="reminderTime" label={t.reminders.time} type="time" disabled={!enabled} error={errors.time?.message} {...register('time')} />
          <TextField
            id="timeZone"
            label={t.reminders.timeZone}
            list="timezones"
            disabled={!enabled}
            error={errors.timeZone?.message}
            {...register('timeZone')}
          />
          <datalist id="timezones">
            {zones.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </div>
        <fieldset className="space-y-2">
          <legend className={EYEBROW}>{t.reminders.channel}</legend>
          <label className="flex items-center gap-3 text-sm text-ink">
            <input type="radio" value="IN_APP" className="accent-saffron" {...register('channel')} />
            {t.reminders.inApp}
          </label>
          <label className="flex items-center gap-3 text-sm text-ink-muted">
            <input type="radio" disabled />
            {t.reminders.push}
          </label>
        </fieldset>
        <FormAlert message={failure} />
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {t.reminders.save}
          </Button>
          {saved && (
            <p role="status" className="text-sm font-medium text-tulasi">
              {t.reminders.saved}
            </p>
          )}
        </div>
      </form>
    </Card>
  )
}
