import {
  addDays,
  dailyTotals,
  dayStatus,
  isLocalDate,
  meetsTarget,
  resolveTarget,
  sumTotals,
  targetCompletion,
  weekDates,
  weekRangeOf,
  type LocalDate,
  type Target,
  type WeekRange,
} from '@sadhana/domain'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import { Link, Navigate, useParams } from 'react-router'
import type { EntryRecord } from '../api/contract'
import { targetsQuery } from '../api/me'
import { Card } from '../components/Card'
import { Ring } from '../components/Ring'
import { ScreenError, ScreenLoading } from '../components/ScreenState'
import { StatusBadge } from '../components/StatusBadge'
import { EYEBROW, ICON_BUTTON } from '../components/styles'
import { todayLocalDate } from '../lib/clock'
import { longDate, shortDate, totalsLine, weekLabel, weekdayShort } from '../lib/format'
import { rise, stagger } from '../lib/motion'
import { useEntries } from '../sync/useEntries'

const ZERO: Target = { rounds: 0, readingMinutes: 0, hearingMinutes: 0 }

const add = (a: Target, b: Target): Target => ({
  rounds: a.rounds + b.rounds,
  readingMinutes: a.readingMinutes + b.readingMinutes,
  hearingMinutes: a.hearingMinutes + b.hearingMinutes,
})

export function WeekScreen() {
  const { start } = useParams()
  const today = todayLocalDate()
  if (start !== undefined && !isLocalDate(start)) return <Navigate to="/week" replace />
  return <WeekReport range={weekRangeOf(start ?? today)} today={today} />
}

function WeekReport({ range, today }: { range: WeekRange; today: LocalDate }) {
  const dates = weekDates(range.start)
  const { query, entries, pendingDates } = useEntries(range.start, range.end)
  const targets = useQuery(targetsQuery)

  if (query.isError || targets.isError) {
    return (
      <ScreenError
        onRetry={() => {
          void query.refetch()
          void targets.refetch()
        }}
      />
    )
  }
  if (!entries || targets.isPending) return <ScreenLoading />

  const byDate = new Map(entries.map((entry) => [entry.localDate, entry]))
  const elapsed = dates.filter((date) => date <= today)
  const records = elapsed.map((date) => byDate.get(date)).filter((entry): entry is EntryRecord => entry !== undefined)
  const totals = sumTotals(records)
  const target = elapsed.reduce((sum, date) => add(sum, resolveTarget(targets.data, date) ?? ZERO), ZERO)
  const completion = targetCompletion(totals, target)
  const recorded = elapsed.filter((date) => dayStatus(byDate.get(date)) === 'RECORDED').length
  const currentWeek = range.start === weekRangeOf(today).start

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-3xl space-y-5 py-6 md:py-10">
      <motion.nav variants={rise} aria-label="Week" className="flex items-center justify-between gap-3">
        <Link to={`/week/${addDays(range.start, -7)}`} aria-label="Previous week" className={ICON_BUTTON}>
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <div className="text-center">
          <p className={EYEBROW}>{currentWeek ? 'This week' : 'Week'}</p>
          <h1 className="font-serif text-2xl text-ink md:text-3xl">{weekLabel(range.start, range.end)}</h1>
        </div>
        {currentWeek ? (
          <span className="size-9" aria-hidden />
        ) : (
          <Link to={`/week/${addDays(range.start, 7)}`} aria-label="Next week" className={ICON_BUTTON}>
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        )}
      </motion.nav>

      <motion.div variants={rise}>
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className={EYEBROW}>Against your targets</p>
            <p className="text-sm text-ink-muted">
              {recorded} of {elapsed.length} days recorded
              {currentWeek && <span> · through today</span>}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Ring percent={completion.rounds} label="Japa" caption={`${totals.rounds} of ${target.rounds} rounds`} />
            <Ring
              percent={completion.readingMinutes}
              label="Reading"
              caption={`${totals.readingMinutes} of ${target.readingMinutes} min`}
            />
            <Ring
              percent={completion.hearingMinutes}
              label="Hearing"
              caption={`${totals.hearingMinutes} of ${target.hearingMinutes} min`}
            />
          </div>
        </Card>
      </motion.div>

      <motion.ul variants={rise} className="grid gap-3 sm:grid-cols-2">
        {dates.map((date) => {
          const entry = byDate.get(date)
          const future = date > today
          const dayTarget = resolveTarget(targets.data, date)
          return (
            <li key={date}>
              <Link to={`/entry/${date}`} aria-label={longDate(date)} className="block h-full">
                <Card
                  className={`h-full transition-colors hover:border-peacock/40 ${date === today ? 'border-saffron/50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-ink">
                      {weekdayShort(date)} <span className="font-normal text-ink-muted">{shortDate(date)}</span>
                    </p>
                    {future ? (
                      <span className="text-xs text-ink-muted">Upcoming</span>
                    ) : (
                      <StatusBadge
                        status={dayStatus(entry)}
                        label={date === today && !entry ? 'Not yet recorded' : undefined}
                      />
                    )}
                  </div>
                  {entry && !future && <p className="mt-2 text-sm text-ink-muted">{totalsLine(dailyTotals(entry))}</p>}
                  {entry && !future && dayTarget && meetsTarget(dailyTotals(entry), dayTarget) && (
                    <p className="mt-1 text-xs font-semibold text-tulasi">Target met</p>
                  )}
                  {pendingDates.has(date) && <p className="mt-1 text-xs font-medium text-saffron-text">Pending sync</p>}
                </Card>
              </Link>
            </li>
          )
        })}
      </motion.ul>
    </motion.div>
  )
}
