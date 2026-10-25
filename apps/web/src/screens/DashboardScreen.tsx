import {
  addDays,
  dailyTotals,
  dayStatus,
  resolveTarget,
  streak,
  targetCompletion,
  weekDates,
  type Target,
} from '@sadhana/domain'
import { useQuery } from '@tanstack/react-query'
import { BellRing, ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router'
import { remindersQuery, targetsQuery } from '../api/me'
import { useUser } from '../auth/AuthContext'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Card } from '../components/Card'
import { Ring } from '../components/Ring'
import { ScreenError, ScreenLoading } from '../components/ScreenState'
import { STATUS_DOT, STATUS_LABELS, StatusBadge } from '../components/StatusBadge'
import { EYEBROW } from '../components/styles'
import { todayLocalDate } from '../lib/clock'
import { firstName, longDate, totalsLine, weekdayShort } from '../lib/format'
import { rise, stagger } from '../lib/motion'
import { isReminderDue } from '../lib/reminders'
import { verseFor } from '../lib/verses'
import { useEntries } from '../sync/useEntries'

const LOOKBACK_DAYS = 120
const ZERO: Target = { rounds: 0, readingMinutes: 0, hearingMinutes: 0 }

export function DashboardScreen() {
  const user = useUser()
  const today = todayLocalDate()
  const { query, entries, pendingDates } = useEntries(addDays(today, -LOOKBACK_DAYS), today)
  const targets = useQuery(targetsQuery)
  const reminders = useQuery(remindersQuery)

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
  const todayEntry = byDate.get(today)
  const status = dayStatus(todayEntry)
  const target = resolveTarget(targets.data, today) ?? ZERO
  const totals = todayEntry ? dailyTotals(todayEntry) : ZERO
  const completion = targetCompletion(totals, target)
  const verse = verseFor(today)
  const due = reminders.data !== undefined && isReminderDue(reminders.data, new Date(), status)

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-3xl space-y-5 py-6 md:py-10">
      <motion.header variants={rise}>
        <p className="text-sm text-ink-muted">{longDate(today)}</p>
        <h1 className="mt-1 font-serif text-3xl text-ink md:text-4xl">Haribol, {firstName(user.name)}.</h1>
        <p className="mt-3 max-w-xl font-serif text-lg italic leading-snug text-ink-muted">
          “{verse.text}” <span className="text-sm not-italic">— {verse.source}</span>
        </p>
      </motion.header>

      {due && (
        <motion.div variants={rise}>
          <Card className="flex items-center gap-4 border-saffron/30 bg-saffron/8">
            <BellRing className="size-5 shrink-0 text-saffron" aria-hidden />
            <p className="flex-1 text-sm text-ink">A gentle reminder: today's sadhana isn't recorded yet.</p>
            <Link to="/entry" className="text-sm font-semibold text-saffron-text">
              Record now
            </Link>
          </Card>
        </motion.div>
      )}

      <motion.div variants={rise} className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className={EYEBROW}>Today</p>
          <div className="mt-3 flex items-center gap-2">
            <StatusBadge status={status} label={status === 'MISSING' ? 'Not yet recorded' : undefined} />
            {pendingDates.has(today) && <span className="text-xs font-medium text-saffron-text">Pending sync</span>}
          </div>
          <p className="mt-3 text-sm text-ink-muted">
            {status === 'MISSING' ? "Record today's sadhana in under two minutes." : totalsLine(totals)}
          </p>
          <Link
            to="/entry"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-saffron px-5 py-2.5 text-sm font-semibold text-white"
          >
            {status === 'MISSING' ? "Record today's sadhana" : "Update today's record"}
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </Card>
        <Card>
          <p className={EYEBROW}>Streak</p>
          <p aria-label="Current streak" className="mt-3 font-serif text-5xl text-ink">
            <AnimatedNumber value={streak(entries, today)} /> <span className="text-lg text-ink-muted">days</span>
          </p>
          <p className="mt-2 text-sm text-ink-muted">Consecutive days with any japa, reading or hearing.</p>
        </Card>
      </motion.div>

      <motion.div variants={rise}>
        <Card>
          <div className="flex items-baseline justify-between">
            <p className={EYEBROW}>Today's targets</p>
            <Link to="/profile" className="text-xs font-semibold text-saffron-text">
              Adjust
            </Link>
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

      <motion.div variants={rise}>
        <Link to="/week" className="block">
          <Card className="flex items-center justify-between gap-4">
            <div>
              <p className={EYEBROW}>This week</p>
              <ul className="mt-3 flex gap-3">
                {weekDates(today).map((date) => {
                  const future = date > today
                  const dayState = dayStatus(byDate.get(date))
                  return (
                    <li
                      key={date}
                      aria-label={`${weekdayShort(date)}: ${future ? 'Upcoming' : STATUS_LABELS[dayState]}`}
                      className="flex flex-col items-center gap-1.5 text-[10px] font-medium text-ink-muted"
                    >
                      <span
                        className={`size-3 rounded-full ${future ? 'border border-line' : STATUS_DOT[dayState]} ${
                          date === today ? 'ring-2 ring-saffron ring-offset-2 ring-offset-card' : ''
                        }`}
                      />
                      {weekdayShort(date).charAt(0)}
                    </li>
                  )
                })}
              </ul>
            </div>
            <ChevronRight className="size-5 text-ink-muted" aria-hidden />
          </Card>
        </Link>
      </motion.div>
    </motion.div>
  )
}
