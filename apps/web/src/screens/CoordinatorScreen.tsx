import { addDays, weekDates, weekRangeOf, type LocalDate } from '@sadhana/domain'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { Group, GroupReport, MemberWeek } from '../api/contract'
import { groupsQuery, reportQuery } from '../api/groups'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { Card } from '../components/Card'
import { GroupSelect } from '../components/GroupSelect'
import { PageHeader } from '../components/PageHeader'
import { Ring } from '../components/Ring'
import { ScreenError, ScreenLoading } from '../components/ScreenState'
import { STATUS_DOT, STATUS_LABELS } from '../components/StatusBadge'
import { EYEBROW, ICON_BUTTON } from '../components/styles'
import { todayLocalDate } from '../lib/clock'
import { minutesLabel, weekLabel, weekdayShort } from '../lib/format'

export function CoordinatorScreen() {
  const groups = useQuery(groupsQuery)
  if (groups.isError) return <ScreenError onRetry={() => void groups.refetch()} />
  if (groups.isPending) return <ScreenLoading />
  const first = groups.data[0]
  if (!first) return <p className="py-20 text-center text-sm text-ink-muted">No groups are assigned to you yet.</p>
  return <GroupReportView groups={groups.data} firstGroupId={first.id} />
}

function GroupReportView({ groups, firstGroupId }: { groups: Group[]; firstGroupId: string }) {
  const today = todayLocalDate()
  const thisWeek = weekRangeOf(today).start
  const [groupId, setGroupId] = useState(firstGroupId)
  const [weekStart, setWeekStart] = useState<LocalDate>(thisWeek)
  const report = useQuery(reportQuery(groupId, weekStart))

  return (
    <div className="mx-auto max-w-5xl space-y-5 py-6 md:py-10">
      <PageHeader title="Group report" subtitle="Participation across the congregation, week by week.">
        <GroupSelect groups={groups} value={groupId} onChange={setGroupId} />
      </PageHeader>
      <nav aria-label="Week" className="flex items-center justify-between gap-3">
        <button type="button" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))} className={ICON_BUTTON}>
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h2 className="font-serif text-2xl text-ink">{weekLabel(weekStart, addDays(weekStart, 6))}</h2>
        <button
          type="button"
          aria-label="Next week"
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

function ReportBody({ report }: { report: GroupReport }) {
  const { summary } = report
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Members" value={summary.members} />
        <Stat label="Active this week" value={summary.active} hint="recorded at least one day" />
        <Stat label="Fully recorded" value={summary.fullyRecorded} hint="no missing days" />
      </div>
      <Card>
        <p className={EYEBROW}>Average completion</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Ring percent={summary.averageCompletion.rounds} label="Japa" caption={`${summary.totals.rounds} rounds in total`} />
          <Ring
            percent={summary.averageCompletion.readingMinutes}
            label="Reading"
            caption={`${minutesLabel(summary.totals.readingMinutes)} in total`}
          />
          <Ring
            percent={summary.averageCompletion.hearingMinutes}
            label="Hearing"
            caption={`${minutesLabel(summary.totals.hearingMinutes)} in total`}
          />
        </div>
      </Card>
      {report.members ? (
        <MemberTable members={report.members} weekStart={report.week.start} />
      ) : (
        <Card className="text-sm text-ink-muted">
          Individual records aren't enabled for this group. An administrator can grant record review for its coordinator.
        </Card>
      )}
    </>
  )
}

const average = (member: MemberWeek) =>
  Math.round((member.completion.rounds + member.completion.readingMinutes + member.completion.hearingMinutes) / 3)

function MemberTable({ members, weekStart }: { members: MemberWeek[]; weekStart: LocalDate }) {
  const dates = weekDates(weekStart)
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
            <th className="px-4 py-3 font-semibold">Devotee</th>
            {dates.map((date) => (
              <th key={date} className="px-1 py-3 text-center font-semibold">
                {weekdayShort(date).charAt(0)}
              </th>
            ))}
            <th className="px-3 py-3 text-right font-semibold">Rounds</th>
            <th className="px-3 py-3 text-right font-semibold">Reading</th>
            <th className="px-3 py-3 text-right font-semibold">Hearing</th>
            <th className="px-4 py-3 text-right font-semibold">Completion</th>
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
                  <span className="sr-only">{STATUS_LABELS[status]}</span>
                </td>
              ))}
              <td className="px-3 py-3 text-right tabular-nums text-ink">{member.totals.rounds}</td>
              <td className="px-3 py-3 text-right tabular-nums text-ink">{minutesLabel(member.totals.readingMinutes)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-ink">{minutesLabel(member.totals.hearingMinutes)}</td>
              <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">{average(member)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
