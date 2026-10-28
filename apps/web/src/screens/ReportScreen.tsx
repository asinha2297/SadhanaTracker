import { addDays, weekDates, weekRangeOf, type LocalDate } from '@sadhana/domain'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { MemberWeek, Report } from '../api/contract'
import { reportQuery } from '../api/report'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { Ring } from '../components/Ring'
import { ScreenError, ScreenLoading } from '../components/ScreenState'
import { STATUS_DOT } from '../components/StatusBadge'
import { EYEBROW, ICON_BUTTON } from '../components/styles'
import { useT } from '../i18n'
import { useFormat } from '../i18n/format'
import { todayLocalDate } from '../lib/clock'

export function ReportScreen() {
  const t = useT()
  const fmt = useFormat()
  const today = todayLocalDate()
  const thisWeek = weekRangeOf(today).start
  const [weekStart, setWeekStart] = useState<LocalDate>(thisWeek)
  const report = useQuery(reportQuery(weekStart))

  return (
    <div className="mx-auto max-w-5xl space-y-5 py-6 md:py-10">
      <PageHeader title={t.report.title} subtitle={t.report.subtitle} />
      <nav aria-label={t.report.weekNav} className="flex items-center justify-between gap-3">
        <button type="button" aria-label={t.report.previousWeek} onClick={() => setWeekStart(addDays(weekStart, -7))} className={ICON_BUTTON}>
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h2 className="font-serif text-2xl text-ink">{fmt.weekLabel(weekStart, addDays(weekStart, 6))}</h2>
        <button
          type="button"
          aria-label={t.report.nextWeek}
          disabled={weekStart === thisWeek}
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className={ICON_BUTTON}
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </nav>
      {report.isError ? (
        <ScreenError onRetry={() => void report.refetch()} />
      ) : report.isPending ? (
        <ScreenLoading />
      ) : (
        <ReportBody report={report.data} />
      )}
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card aria-label={label}>
      <p className={EYEBROW}>{label}</p>
      <p className="mt-2 font-serif text-4xl text-ink">
        <AnimatedNumber value={value} />
      </p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </Card>
  )
}

function ReportBody({ report }: { report: Report }) {
  const t = useT()
  const fmt = useFormat()
  const { summary } = report
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t.report.devotees} value={summary.members} />
        <Stat label={t.report.activeThisWeek} value={summary.active} hint={t.report.activeHint} />
        <Stat label={t.report.fullyRecorded} value={summary.fullyRecorded} hint={t.report.fullyHint} />
      </div>
      <Card>
        <p className={EYEBROW}>{t.report.averageCompletion}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Ring percent={summary.averageCompletion.rounds} label={t.practices.japa} caption={t.report.roundsTotal(fmt.number(summary.totals.rounds))} />
          <Ring
            percent={summary.averageCompletion.readingMinutes}
            label={t.practices.reading}
            caption={t.report.minutesTotal(fmt.minutes(summary.totals.readingMinutes))}
          />
          <Ring
            percent={summary.averageCompletion.hearingMinutes}
            label={t.practices.hearing}
            caption={t.report.minutesTotal(fmt.minutes(summary.totals.hearingMinutes))}
          />
        </div>
      </Card>
      {report.members ? (
        <MemberTable members={report.members} weekStart={report.week.start} />
      ) : (
        <Card className="text-sm text-ink-muted">{t.report.noIndividual}</Card>
      )}
    </>
  )
}

const average = (member: MemberWeek) =>
  Math.round((member.completion.rounds + member.completion.readingMinutes + member.completion.hearingMinutes) / 3)

function MemberTable({ members, weekStart }: { members: MemberWeek[]; weekStart: LocalDate }) {
  const t = useT()
  const fmt = useFormat()
  const dates = weekDates(weekStart)
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
            <th className="px-4 py-3 font-semibold">{t.report.devotee}</th>
            {dates.map((date) => (
              <th key={date} className="px-1 py-3 text-center font-semibold">
                {fmt.weekdayShort(date).charAt(0)}
              </th>
            ))}
            <th className="px-3 py-3 text-right font-semibold">{t.report.rounds}</th>
            <th className="px-3 py-3 text-right font-semibold">{t.report.reading}</th>
            <th className="px-3 py-3 text-right font-semibold">{t.report.hearing}</th>
            <th className="px-4 py-3 text-right font-semibold">{t.report.completion}</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.devoteeId} className="border-t border-line">
              <td className="px-4 py-3">
                <span className="font-medium text-ink">{member.name}</span>
                <span className="block text-xs text-ink-muted">{member.devoteeId}</span>
              </td>
              {member.days.map((status, index) => (
                <td key={dates[index]} className="px-1 py-3 text-center">
                  <span className={`inline-block size-2.5 rounded-full ${STATUS_DOT[status]}`} />
                  <span className="sr-only">{t.dayStatus[status]}</span>
                </td>
              ))}
              <td className="px-3 py-3 text-right tabular-nums text-ink">{fmt.number(member.totals.rounds)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-ink">{fmt.minutes(member.totals.readingMinutes)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-ink">{fmt.minutes(member.totals.hearingMinutes)}</td>
              <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">{fmt.percent(average(member))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
