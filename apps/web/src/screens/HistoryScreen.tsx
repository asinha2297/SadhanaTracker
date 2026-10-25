import { addDays, dailyTotals, dayStatus, type DayStatus, type LocalDate } from '@sadhana/domain'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '../components/PageHeader'
import { ScreenError, ScreenLoading } from '../components/ScreenState'
import { StatusBadge } from '../components/StatusBadge'
import { chip, ICON_BUTTON } from '../components/styles'
import { todayLocalDate } from '../lib/clock'
import { monthBounds, monthLabel, shiftMonth, shortDate, totalsLine, weekdayShort } from '../lib/format'
import { useEntries } from '../sync/useEntries'

type Filter = 'ALL' | DayStatus

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'RECORDED', label: 'Recorded' },
  { key: 'ZERO_ENTRY', label: 'Zero days' },
  { key: 'MISSING', label: 'Missing' },
]

export function HistoryScreen() {
  const today = todayLocalDate()
  const currentMonth = today.slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [first, monthEnd] = monthBounds(month)
  const last = monthEnd < today ? monthEnd : today
  const { query, entries, pendingDates } = useEntries(first, last)

  if (query.isError) return <ScreenError onRetry={() => void query.refetch()} />
  if (!entries) return <ScreenLoading />

  const byDate = new Map(entries.map((entry) => [entry.localDate, entry]))
  const days: LocalDate[] = []
  for (let date = last; date >= first; date = addDays(date, -1)) days.push(date)
  const rows = days.map((date) => ({ date, entry: byDate.get(date), status: dayStatus(byDate.get(date)) }))
  const count = (status: DayStatus) => rows.filter((row) => row.status === status).length
  const visible = filter === 'ALL' ? rows : rows.filter((row) => row.status === filter)

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-6 md:py-10">
      <PageHeader title="History" subtitle="Every day you have recorded, and the ones you have not." />
      <nav aria-label="Month" className="flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))} className={ICON_BUTTON}>
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h2 className="font-serif text-2xl text-ink">{monthLabel(first)}</h2>
        <button
          type="button"
          aria-label="Next month"
          disabled={month === currentMonth}
          onClick={() => setMonth(shiftMonth(month, 1))}
          className={ICON_BUTTON}
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </nav>
      <p className="text-sm text-ink-muted">
        {count('RECORDED')} recorded · {count('ZERO_ENTRY')} zero days · {count('MISSING')} missing
      </p>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={filter === option.key}
            onClick={() => setFilter(option.key)}
            className={chip(filter === option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <ul aria-label="Timeline" className="space-y-2">
        {visible.map(({ date, entry, status }) => (
          <li key={date}>
            <Link
              to={`/entry/${date}`}
              className="flex items-start gap-4 rounded-2xl border border-line bg-card px-4 py-3 transition-colors hover:border-saffron/40"
            >
              <div className="w-14 shrink-0">
                <p className="font-medium text-ink">{shortDate(date)}</p>
                <p className="text-xs text-ink-muted">{weekdayShort(date)}</p>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={status} label={date === today && !entry ? 'Not yet recorded' : undefined} />
                  {pendingDates.has(date) && <span className="text-xs font-medium text-saffron-text">Pending sync</span>}
                </div>
                {entry && status === 'RECORDED' && <p className="text-sm text-ink-muted">{totalsLine(dailyTotals(entry))}</p>}
                {entry?.reflection && <p className="font-serif text-sm italic text-ink-muted">“{entry.reflection}”</p>}
              </div>
              <ChevronRight className="mt-1 size-4 shrink-0 text-ink-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      {visible.length === 0 && <p className="text-sm text-ink-muted">Nothing matches this filter.</p>}
    </div>
  )
}
