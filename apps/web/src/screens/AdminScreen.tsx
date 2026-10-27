import { zodResolver } from '@hookform/resolvers/zod'
import { LocalDateSchema, resolveTarget, TargetSchema, type EffectiveTarget, type LocalDate, type Target } from '@sadhana/domain'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { auditQuery, postRecommendedTarget } from '../api/admin'
import type { AuditEvent } from '../api/contract'
import { targetsQuery } from '../api/me'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { FormAlert } from '../components/FormAlert'
import { PageHeader } from '../components/PageHeader'
import { ScreenError, ScreenLoading } from '../components/ScreenState'
import { EYEBROW } from '../components/styles'
import { TextField } from '../components/TextField'
import { auditLabel } from '../lib/audit'
import { todayLocalDate } from '../lib/clock'
import { instantLabel, shortDate, totalsLine } from '../lib/format'

const ZERO: Target = { rounds: 0, readingMinutes: 0, hearingMinutes: 0 }

type RecommendedForm = Target & { effectiveDate: LocalDate }

export function AdminScreen() {
  const targets = useQuery(targetsQuery)
  const audit = useQuery(auditQuery)

  if (targets.isError || audit.isError) {
    return (
      <ScreenError
        onRetry={() => {
          void targets.refetch()
          void audit.refetch()
        }}
      />
    )
  }
  if (targets.isPending || audit.isPending) return <ScreenLoading />

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6 md:py-10">
      <PageHeader title="Administration" subtitle="Congregation defaults and the security audit log." />
      <RecommendedTargets recommended={targets.data.recommended} />
      <AuditLog events={audit.data} />
    </div>
  )
}

function RecommendedTargets({ recommended }: { recommended: EffectiveTarget[] }) {
  const today = todayLocalDate()
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)
  const [failure, setFailure] = useState<string>()
  const current = resolveTarget({ recommended, personal: [] }, today) ?? ZERO
  const history = [...recommended].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))
  const schema = useMemo(
    () =>
      TargetSchema.extend({
        effectiveDate: LocalDateSchema.refine((date) => date >= today, 'Choose today or a later date'),
      }),
    [today],
  )
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecommendedForm>({ resolver: zodResolver(schema), defaultValues: { ...current, effectiveDate: today } })

  const submit = handleSubmit(async ({ effectiveDate, ...target }) => {
    setSaved(false)
    setFailure(undefined)
    try {
      const updated = await postRecommendedTarget({ effectiveDate, target })
      queryClient.setQueryData(targetsQuery.queryKey, (previous) => previous && { ...previous, recommended: updated })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] })
      setSaved(true)
    } catch {
      setFailure("We couldn't save the target. Check your connection and try again.")
    }
  })

  return (
    <Card>
      <h2 className="font-serif text-xl text-ink">Recommended targets</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Today the congregation recommends <span className="font-medium text-ink">{totalsLine(current)}</span>.
      </p>
      <form onSubmit={submit} noValidate className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <TextField
            id="recommended-rounds"
            label="Rounds"
            type="number"
            inputMode="numeric"
            min={0}
            error={errors.rounds?.message}
            {...register('rounds', { valueAsNumber: true })}
          />
          <TextField
            id="recommended-reading"
            label="Reading minutes"
            type="number"
            inputMode="numeric"
            min={0}
            error={errors.readingMinutes?.message}
            {...register('readingMinutes', { valueAsNumber: true })}
          />
          <TextField
            id="recommended-hearing"
            label="Hearing minutes"
            type="number"
            inputMode="numeric"
            min={0}
            error={errors.hearingMinutes?.message}
            {...register('hearingMinutes', { valueAsNumber: true })}
          />
          <TextField
            id="recommended-from"
            label="Effective from"
            type="date"
            min={today}
            error={errors.effectiveDate?.message}
            {...register('effectiveDate')}
          />
        </div>
        <p className="text-xs text-ink-muted">Past weeks keep the target that was active then; nothing is recalculated.</p>
        <FormAlert message={failure} />
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            Save recommended target
          </Button>
          {saved && (
            <p role="status" className="text-sm font-medium text-tulasi">
              Recommended target saved.
            </p>
          )}
        </div>
      </form>
      <div className="mt-6 border-t border-line pt-4">
        <p className={EYEBROW}>History</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {history.map((item) => (
            <li key={item.effectiveDate} className="flex flex-wrap justify-between gap-2">
              <span className="text-ink">From {shortDate(item.effectiveDate)}</span>
              <span className="text-ink-muted">{totalsLine(item.target)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

function AuditLog({ events }: { events: AuditEvent[] }) {
  return (
    <Card>
      <h2 className="font-serif text-xl text-ink">Audit log</h2>
      <p className="mt-1 text-xs text-ink-muted">Every security-relevant action, permanent and newest first.</p>
      <ul aria-label="Audit log" className="mt-3 divide-y divide-line">
        {events.map((event) => (
          <li key={event.id} className="py-2.5 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-ink">
                {auditLabel(event.action)}
                {event.subject && <span className="font-normal text-ink-muted"> · {event.subject}</span>}
              </span>
              <time dateTime={event.at} className="text-xs text-ink-muted">
                {instantLabel(event.at)}
              </time>
            </div>
            <p className="text-xs text-ink-muted">
              by {event.actor}
              {event.details && ` · ${event.details}`}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
