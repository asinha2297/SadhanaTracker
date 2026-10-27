import { zodResolver } from '@hookform/resolvers/zod'
import { normalizePhone, resolveTarget, type Target, type TargetHistory } from '@sadhana/domain'
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
import { SendCode } from '../components/SendCode'
import { EYEBROW } from '../components/styles'
import { TextField } from '../components/TextField'
import { todayLocalDate } from '../lib/clock'
import { shortDate, totalsLine } from '../lib/format'
import { targetChoiceForm, toTargetChoice, type TargetFormValues } from './profile/targetForm'

const ZERO: Target = { rounds: 0, readingMinutes: 0, hearingMinutes: 0 }

export function ProfileScreen() {
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
      <PageHeader title="Profile & targets" subtitle="Your details, and the standard you have set for yourself." />
      <ProfileForm profile={profile.data} />
      <TargetsCard history={targets.data} />
    </div>
  )
}

type ProfileFormValues = z.input<typeof ProfileInputSchema>
type ContactField = 'phone' | 'email' | 'code'

const formValues = (profile: Profile): ProfileFormValues => ({
  phone: profile.phone,
  email: profile.email ?? '',
  address: profile.address ?? '',
  code: '',
})

function ProfileForm({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)
  const [failure, setFailure] = useState<string>()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues, unknown, ProfileInput>({
    resolver: zodResolver(ProfileInputSchema),
    defaultValues: formValues(profile),
  })
  const phone = useWatch({ control, name: 'phone' })
  // A new number must be verified before it becomes the way this devotee signs in.
  const phoneChanged = (normalizePhone(phone) ?? phone.trim()) !== profile.phone

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
        setFailure("We couldn't save your profile. Check your connection and try again.")
      }
    }
  })

  return (
    <Card>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl text-ink">Your details</h2>
          <p className="text-xs text-ink-muted">ID {profile.devoteeId}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-ink">{profile.name}</p>
          <p className="text-xs text-ink-muted">An administrator can correct your name if it has changed.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <TextField id="phone" label="Mobile number" type="tel" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
            {phoneChanged && <SendCode phone={phone} onPhoneError={(message) => setError('phone', { message })} />}
          </div>
          <TextField id="email" label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        </div>
        {phoneChanged && (
          <TextField
            id="code"
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            error={errors.code?.message}
            {...register('code')}
          />
        )}
        <p className="text-xs text-ink-muted">You sign in with your mobile number or email.</p>
        <TextField id="address" label="Address" autoComplete="street-address" error={errors.address?.message} {...register('address')} />
        <FormAlert message={failure} />
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            Save profile
          </Button>
          {saved && (
            <p role="status" className="text-sm font-medium text-tulasi">
              Profile saved.
            </p>
          )}
        </div>
      </form>
    </Card>
  )
}

function TargetsCard({ history }: { history: TargetHistory }) {
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

  const submit = handleSubmit(async (values) => {
    setSaved(false)
    setFailure(undefined)
    try {
      queryClient.setQueryData(targetsQuery.queryKey, await postTargetChoice(toTargetChoice(values)))
      setSaved(true)
    } catch {
      setFailure("We couldn't save your target. Check your connection and try again.")
    }
  })

  return (
    <Card>
      <h2 className="font-serif text-xl text-ink">Targets</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Your target today · <span className="font-medium text-ink">{activeChoice?.kind === 'PERSONAL' ? 'Personal' : 'Recommended'}</span>
      </p>
      <p className="mt-1 font-medium text-ink">{totalsLine(current)}</p>
      <p className="mt-2 text-xs text-ink-muted">The congregation recommends {totalsLine(recommended)}.</p>

      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
        <fieldset className="space-y-2">
          <legend className="sr-only">Target source</legend>
          <label className="flex items-center gap-3 text-sm text-ink">
            <input type="radio" value="RECOMMENDED" className="accent-saffron" {...register('kind')} />
            Follow the congregation's recommended target
          </label>
          <label className="flex items-center gap-3 text-sm text-ink">
            <input type="radio" value="PERSONAL" className="accent-saffron" {...register('kind')} />
            Set a personal target
          </label>
        </fieldset>
        {kind === 'PERSONAL' && (
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField
              id="target-rounds"
              label="Rounds per day"
              type="number"
              inputMode="numeric"
              min={0}
              error={errors.rounds?.message}
              {...register('rounds', { valueAsNumber: true })}
            />
            <TextField
              id="target-reading"
              label="Reading minutes per day"
              type="number"
              inputMode="numeric"
              min={0}
              error={errors.readingMinutes?.message}
              {...register('readingMinutes', { valueAsNumber: true })}
            />
            <TextField
              id="target-hearing"
              label="Hearing minutes per day"
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
          label="Effective from"
          type="date"
          min={today}
          error={errors.effectiveDate?.message}
          {...register('effectiveDate')}
        />
        <p className="text-xs text-ink-muted">Earlier days keep the target that was active then.</p>
        <FormAlert message={failure} />
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            Save target
          </Button>
          {saved && (
            <p role="status" className="text-sm font-medium text-tulasi">
              Target saved.
            </p>
          )}
        </div>
      </form>

      {choices.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <p className={EYEBROW}>Your changes</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {choices.map((choice) => (
              <li key={`${choice.effectiveDate}-${choice.kind}`} className="flex flex-wrap justify-between gap-2">
                <span className="text-ink">
                  {choice.kind === 'PERSONAL' ? 'Personal' : 'Recommended'} · from {shortDate(choice.effectiveDate)}
                </span>
                <span className="text-ink-muted">{totalsLine(choice.kind === 'PERSONAL' ? choice.target : recommended)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
