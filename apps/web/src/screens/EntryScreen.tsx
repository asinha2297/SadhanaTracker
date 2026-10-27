import { zodResolver } from '@hookform/resolvers/zod'
import {
  addDays,
  DailyEntrySchema,
  dailyTotals,
  EDIT_WINDOW_DAYS,
  isEditable,
  isLocalDate,
  resolveTarget,
  type DailyEntry,
  type LocalDate,
  type Target,
} from '@sadhana/domain'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Lock, Minus, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import type { EntryRecord } from '../api/contract'
import { targetsQuery } from '../api/me'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EntrySummary } from '../components/EntrySummary'
import { FormAlert } from '../components/FormAlert'
import { ScreenError, ScreenLoading } from '../components/ScreenState'
import { EYEBROW, ICON_BUTTON } from '../components/styles'
import { todayLocalDate } from '../lib/clock'
import { longDate, totalsLine } from '../lib/format'
import { useSync, type SyncProblem } from '../sync/SyncContext'
import { useEntries } from '../sync/useEntries'
import { useSaveEntry } from '../sync/useSaveEntry'
import { HearingRows, ReadingRows } from './entry/SessionRows'

const ZERO: Target = { rounds: 0, readingMinutes: 0, hearingMinutes: 0 }

const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)
const sumMinutes = (sessions: unknown) =>
  Array.isArray(sessions) ? sessions.reduce((sum: number, s) => sum + num((s as { minutes?: unknown })?.minutes), 0) : 0

const toForm = (entry: DailyEntry): DailyEntry => ({
  localDate: entry.localDate,
  rounds: entry.rounds,
  reflection: entry.reflection ?? '',
  reading: entry.reading.map((s) => ({ bookTitle: s.bookTitle, chapterOrSection: s.chapterOrSection ?? '', minutes: s.minutes })),
  hearing: entry.hearing.map((s) => ({
    lectureTitle: s.lectureTitle,
    speaker: s.speaker ?? '',
    source: s.source ?? '',
    minutes: s.minutes,
  })),
})

export function EntryScreen() {
  const { localDate } = useParams()
  const today = todayLocalDate()
  if (localDate !== undefined && !isLocalDate(localDate)) return <Navigate to="/entry" replace />
  return <EntryDay date={localDate ?? today} today={today} />
}

function EntryDay({ date, today }: { date: LocalDate; today: LocalDate }) {
  const { query, entries } = useEntries(date, date)
  const targets = useQuery(targetsQuery)
  const { queue, problems, resolve } = useSync()

  if (query.isError) return <ScreenError onRetry={() => void query.refetch()} />
  if (!entries || targets.isPending) return <ScreenLoading />

  const existing = entries[0]
  const queued = queue.find((item) => item.entry.localDate === date)
  const problem = problems.find((candidate) => candidate.queued.entry.localDate === date)
  const target = (targets.data && resolveTarget(targets.data, date)) ?? ZERO

  return (
    <div className="mx-auto max-w-3xl py-6 md:py-10">
      <nav aria-label="Day" className="flex items-center justify-between gap-3">
        <Link to={`/entry/${addDays(date, -1)}`} aria-label="Previous day" className={ICON_BUTTON}>
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <div className="text-center">
          <p className={EYEBROW}>{date === today ? 'Today' : 'Record sadhana'}</p>
          <h1 className="font-serif text-2xl text-ink md:text-3xl">{longDate(date)}</h1>
        </div>
        {date < today ? (
          <Link to={`/entry/${addDays(date, 1)}`} aria-label="Next day" className={ICON_BUTTON}>
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        ) : (
          <span className="size-9" aria-hidden />
        )}
      </nav>

      {isEditable(date, today) ? (
        <EntryForm
          key={`${date}:${existing?.updatedAt ?? 'new'}`}
          date={date}
          today={today}
          existing={existing}
          base={queued ? queued.baseUpdatedAt : existing?.updatedAt}
          target={target}
          problem={problem}
          onResolve={() => resolve(date)}
        />
      ) : (
        <div className="mt-6 space-y-4">
          <Card className="flex items-center gap-3 text-sm text-ink-muted">
            <Lock className="size-4 shrink-0" aria-hidden />
            {date > today ? "This day hasn't arrived yet." : `Entries older than ${EDIT_WINDOW_DAYS} days can't be changed.`}
          </Card>
          {existing ? (
            <EntrySummary entry={existing} />
          ) : (
            <Card>
              <p className="text-sm text-ink-muted">No record for this day.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function ConflictCard({
  intro,
  server,
  onKeep,
  onUseTheirs,
}: {
  intro: string
  server: EntryRecord
  onKeep: () => void
  onUseTheirs: () => void
}) {
  const time = new Date(server.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return (
    <Card role="alert" className="border-saffron/40 bg-saffron/8">
      <p className="font-medium text-ink">
        {intro} at {time}.
      </p>
      <p className="mt-1 text-sm text-ink-muted">Their record: {totalsLine(dailyTotals(server))}.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" onClick={onKeep}>
          Keep mine
        </Button>
        <button
          type="button"
          onClick={onUseTheirs}
          className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink"
        >
          Use theirs
        </button>
      </div>
    </Card>
  )
}

function RoundsField({ form, target }: { form: UseFormReturn<DailyEntry>; target: number }) {
  const rounds = useWatch({ control: form.control, name: 'rounds' })
  const current = num(rounds)
  const set = (value: number) =>
    form.setValue('rounds', Math.max(0, value), { shouldDirty: true, shouldValidate: true })
  const error = form.formState.errors.rounds?.message
  return (
    <Card aria-label="Japa">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-ink">Japa</h2>
        <p className="text-xs text-ink-muted">Target {target} rounds</p>
      </div>
      <div className="mt-4 flex items-center justify-center gap-5">
        <button
          type="button"
          aria-label="One round fewer"
          onClick={() => set(current - 1)}
          className="flex size-12 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-peacock/8"
        >
          <Minus className="size-5" aria-hidden />
        </button>
        <div className="text-center">
          <input
            id="rounds"
            type="number"
            inputMode="numeric"
            min={0}
            className="w-28 bg-transparent text-center font-serif text-5xl text-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            {...form.register('rounds', { valueAsNumber: true })}
          />
          <label htmlFor="rounds" className="block text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Rounds
          </label>
        </div>
        <button
          type="button"
          aria-label="One round more"
          onClick={() => set(current + 1)}
          className="flex size-12 items-center justify-center rounded-full bg-saffron text-white"
        >
          <Plus className="size-5" aria-hidden />
        </button>
      </div>
      {error && <p className="mt-2 text-center text-sm text-red-700">{error}</p>}
    </Card>
  )
}

function EntryForm({
  date,
  today,
  existing,
  base,
  target,
  problem,
  onResolve,
}: {
  date: LocalDate
  today: LocalDate
  existing: EntryRecord | undefined
  base: string | undefined
  target: Target
  problem: SyncProblem | undefined
  onResolve: () => void
}) {
  const navigate = useNavigate()
  const save = useSaveEntry()
  const baseRef = useRef(base)
  const [conflict, setConflict] = useState<EntryRecord>()
  const [failure, setFailure] = useState<string>()
  const form = useForm<DailyEntry>({
    resolver: zodResolver(DailyEntrySchema),
    defaultValues: existing ? toForm(existing) : { localDate: date, rounds: 0, reflection: '', reading: [], hearing: [] },
  })
  const values = useWatch({ control: form.control })
  const totals: Target = {
    rounds: num(values.rounds),
    readingMinutes: sumMinutes(values.reading),
    hearingMinutes: sumMinutes(values.hearing),
  }
  const zeroDay = totals.rounds === 0 && totals.readingMinutes === 0 && totals.hearingMinutes === 0

  const persist = async (entry: DailyEntry, baseUpdatedAt: string | undefined) => {
    setFailure(undefined)
    setConflict(undefined)
    const result = await save(entry, baseUpdatedAt)
    if (result.outcome === 'conflict') setConflict(result.server)
    else if (result.outcome === 'rejected') setFailure("This day can't be saved. It may be outside the editing window now.")
    else void navigate('/')
  }

  const keepMine = (server: EntryRecord, entry: DailyEntry) => {
    baseRef.current = server.updatedAt
    void persist(entry, server.updatedAt)
  }

  const useTheirs = (server: EntryRecord) => {
    baseRef.current = server.updatedAt
    form.reset(toForm(server))
    setConflict(undefined)
  }

  return (
    <form onSubmit={form.handleSubmit((entry) => persist(entry, baseRef.current))} noValidate className="mt-6 space-y-4">
      <p className="text-center text-sm text-ink-muted">
        {date === today ? "Haribol. Record today's sadhana in under two minutes." : 'Backfilling a past day keeps your week honest.'}
      </p>
      <FormAlert message={failure} />
      {problem &&
        (problem.server ? (
          <ConflictCard
            intro="Your offline entry for this day couldn't be synced: it was updated elsewhere"
            server={problem.server}
            onKeep={() => {
              onResolve()
              keepMine(problem.server as EntryRecord, problem.queued.entry)
            }}
            onUseTheirs={onResolve}
          />
        ) : (
          <Card role="alert" className="flex items-center justify-between gap-3 border-saffron/40 bg-saffron/8 text-sm">
            <p className="text-ink">Your offline entry for this day was not accepted by the server; it may be locked now.</p>
            <button type="button" onClick={onResolve} className="shrink-0 font-semibold text-saffron-text">
              Dismiss
            </button>
          </Card>
        ))}
      {conflict && (
        <ConflictCard
          intro="This day was updated elsewhere"
          server={conflict}
          onKeep={() => void form.handleSubmit((entry) => keepMine(conflict, entry))()}
          onUseTheirs={() => useTheirs(conflict)}
        />
      )}

      <RoundsField form={form} target={target.rounds} />
      <ReadingRows form={form} />
      <HearingRows form={form} />

      <Card aria-label="Reflection">
        <label htmlFor="reflection" className="font-serif text-xl text-ink">
          Reflection
        </label>
        <p className="mt-1 text-xs text-ink-muted">Optional, and private to you.</p>
        <textarea
          id="reflection"
          rows={3}
          className="mt-3 block w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-base text-ink"
          {...form.register('reflection')}
        />
      </Card>

      {zeroDay && (
        <p className="text-center text-sm text-saffron-text">This will be saved as a zero day. Honest tracking counts too.</p>
      )}

      <div className="sticky bottom-24 z-10 flex items-center justify-between gap-4 rounded-2xl border border-line bg-card/90 p-4 shadow-lg backdrop-blur-xl md:bottom-6">
        <p className="text-sm font-medium text-ink">{totalsLine(totals)}</p>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
