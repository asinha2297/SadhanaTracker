import { zodResolver } from '@hookform/resolvers/zod'
import { resolveTarget, type Target, type TargetHistory } from '@sadhana/domain'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { z } from 'zod'
import { applyFieldIssues } from '../api/client'
import { ProfileInputSchema, type Profile, type ProfileInput } from '../api/contract'
import { postTargetChoice, profileQuery, putProfile, targetsQuery } from '../api/me'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { FormAlert } from '../components/FormAlert'
import { PageHeader } from '../components/PageHeader'
import { ScreenError, ScreenLoading } from '../components/ScreenState'
import { EYEBROW } from '../components/styles'
import { TextField } from '../components/TextField'
import { useT } from '../i18n'
import { useFormat } from '../i18n/format'
import { todayLocalDate } from '../lib/clock'
import { targetChoiceForm, toTargetChoice, type TargetFormValues } from './profile/targetForm'

const ZERO: Target = { rounds: 0, readingMinutes: 0, hearingMinutes: 0 }

export function ProfileScreen() {
  const t = useT()
  const profile = useQuery(profileQuery)
  const targets = useQuery(targetsQuery)

  if (profile.isError || targets.isError) {
    return (
      <ScreenError
        onRetry={() => {
          void profile.refetch()
          void targets.refetch()
        }}
      />
    )
  }
  if (profile.isPending || targets.isPending) return <ScreenLoading />

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6 md:py-10">
      <PageHeader title={t.profile.title} subtitle={t.profile.subtitle} />
      <ProfileForm profile={profile.data} />
      <TargetsCard history={targets.data} />
    </div>
  )
}

type ProfileFormValues = z.input<typeof ProfileInputSchema>
type ContactField = 'phone' | 'email'

const formValues = (profile: Profile): ProfileFormValues => ({
  phone: profile.phone,
  email: profile.email ?? '',
  address: profile.address ?? '',
})

function ProfileForm({ profile }: { profile: Profile }) {
  const t = useT()
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)
  const [failure, setFailure] = useState<string>()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues, unknown, ProfileInput>({
    resolver: zodResolver(ProfileInputSchema),
    defaultValues: formValues(profile),
  })

  const submit = handleSubmit(async (input) => {
    setSaved(false)
    setFailure(undefined)
    try {
      const updated = await putProfile(input)
      queryClient.setQueryData(profileQuery.queryKey, updated)
      reset(formValues(updated))
      setSaved(true)
    } catch (error) {
      if (!applyFieldIssues(error, (field, message) => setError(field as ContactField, { message }))) {
        setFailure(t.profile.saveFailed)
      }
    }
  })

  return (
    <Card>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl text-ink">{t.profile.details}</h2>
          <p className="text-xs text-ink-muted">{t.profile.id(profile.devoteeId)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-ink">{profile.name}</p>
          <p className="text-xs text-ink-muted">{t.profile.nameHint}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="phone" label={t.profile.phone} type="tel" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
          <TextField id="email" label={t.profile.email} type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        </div>
        <p className="text-xs text-ink-muted">{t.profile.signInHint}</p>
        <TextField id="address" label={t.profile.address} autoComplete="street-address" error={errors.address?.message} {...register('address')} />
        <FormAlert message={failure} />
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {t.profile.save}
          </Button>
          {saved && (
            <p role="status" className="text-sm font-medium text-tulasi">
              {t.profile.saved}
            </p>
          )}
        </div>
      </form>
    </Card>
  )
}

function TargetsCard({ history }: { history: TargetHistory }) {
  const t = useT()
  const fmt = useFormat()
  const today = todayLocalDate()
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)
  const [failure, setFailure] = useState<string>()
  const current = resolveTarget(history, today) ?? ZERO
  const recommended = resolveTarget({ recommended: history.recommended, personal: [] }, today) ?? ZERO
  const choices = [...history.personal].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))
  const activeChoice = choices.find((choice) => choice.effectiveDate <= today)
  const schema = useMemo(() => targetChoiceForm(today), [today])
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TargetFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: activeChoice?.kind ?? 'RECOMMENDED',
      effectiveDate: today,
      rounds: current.rounds,
      readingMinutes: current.readingMinutes,
      hearingMinutes: current.hearingMinutes,
    },
  })
  const kind = useWatch({ control, name: 'kind' })
  const kindLabel = (choice: 'PERSONAL' | 'RECOMMENDED') => (choice === 'PERSONAL' ? t.profile.personal : t.profile.recommended)

  const submit = handleSubmit(async (values) => {
    setSaved(false)
    setFailure(undefined)
    try {
      queryClient.setQueryData(targetsQuery.queryKey, await postTargetChoice(toTargetChoice(values)))
      setSaved(true)
    } catch {
      setFailure(t.profile.targetFailed)
    }
  })

  return (
    <Card>
      <h2 className="font-serif text-xl text-ink">{t.profile.targets}</h2>
      <p className="mt-2 text-sm text-ink-muted">
        {t.profile.targetToday}
        <span className="font-medium text-ink">{kindLabel(activeChoice?.kind ?? 'RECOMMENDED')}</span>
      </p>
      <p className="mt-1 font-medium text-ink">{fmt.totals(current)}</p>
      <p className="mt-2 text-xs text-ink-muted">{t.profile.congregationRecommends(fmt.totals(recommended))}</p>

      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
        <fieldset className="space-y-2">
          <legend className="sr-only">{t.profile.targetSource}</legend>
          <label className="flex items-center gap-3 text-sm text-ink">
            <input type="radio" value="RECOMMENDED" className="accent-saffron" {...register('kind')} />
            {t.profile.followRecommended}
          </label>
          <label className="flex items-center gap-3 text-sm text-ink">
            <input type="radio" value="PERSONAL" className="accent-saffron" {...register('kind')} />
            {t.profile.setPersonal}
          </label>
        </fieldset>
        {kind === 'PERSONAL' && (
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField
              id="target-rounds"
              label={t.profile.roundsPerDay}
              type="number"
              inputMode="numeric"
              min={0}
              error={errors.rounds?.message}
              {...register('rounds', { valueAsNumber: true })}
            />
            <TextField
              id="target-reading"
              label={t.profile.readingPerDay}
              type="number"
              inputMode="numeric"
              min={0}
              error={errors.readingMinutes?.message}
              {...register('readingMinutes', { valueAsNumber: true })}
            />
            <TextField
              id="target-hearing"
              label={t.profile.hearingPerDay}
              type="number"
              inputMode="numeric"
              min={0}
              error={errors.hearingMinutes?.message}
              {...register('hearingMinutes', { valueAsNumber: true })}
            />
          </div>
        )}
        <TextField
          id="effectiveDate"
          label={t.profile.effectiveFrom}
          type="date"
          min={today}
          error={errors.effectiveDate?.message}
          {...register('effectiveDate')}
        />
        <p className="text-xs text-ink-muted">{t.profile.earlierDays}</p>
        <FormAlert message={failure} />
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {t.profile.saveTarget}
          </Button>
          {saved && (
            <p role="status" className="text-sm font-medium text-tulasi">
              {t.profile.targetSaved}
            </p>
          )}
        </div>
      </form>

      {choices.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <p className={EYEBROW}>{t.profile.yourChanges}</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {choices.map((choice) => (
              <li key={`${choice.effectiveDate}-${choice.kind}`} className="flex flex-wrap justify-between gap-2">
                <span className="text-ink">{t.profile.fromDate(kindLabel(choice.kind), fmt.shortDate(choice.effectiveDate))}</span>
                <span className="text-ink-muted">{fmt.totals(choice.kind === 'PERSONAL' ? choice.target : recommended)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
