import { dailyTotals, dayStatus, type DailyEntry } from '@sadhana/domain'
import { minutesLabel, totalsLine } from '../lib/format'
import { Card } from './Card'
import { StatusBadge } from './StatusBadge'

interface SessionLine {
  title: string
  detail?: string | undefined
  minutes: number
}

function SessionList({ title, items }: { title: string; items: SessionLine[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">{title}</p>
      <ul className="mt-1.5 space-y-1 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex justify-between gap-3">
            <span className="text-ink">
              {item.title}
              {item.detail && <span className="text-ink-muted"> · {item.detail}</span>}
            </span>
            <span className="shrink-0 text-ink-muted">{minutesLabel(item.minutes)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function EntrySummary({ entry }: { entry: DailyEntry }) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status={dayStatus(entry)} />
        <p className="text-sm text-ink-muted">{totalsLine(dailyTotals(entry))}</p>
      </div>
      {entry.reading.length > 0 && (
        <SessionList
          title="Reading"
          items={entry.reading.map((s) => ({ title: s.bookTitle, detail: s.chapterOrSection, minutes: s.minutes }))}
        />
      )}
      {entry.hearing.length > 0 && (
        <SessionList
          title="Hearing"
          items={entry.hearing.map((s) => ({
            title: s.lectureTitle,
            detail: [s.speaker, s.source].filter(Boolean).join(' · ') || undefined,
            minutes: s.minutes,
          }))}
        />
      )}
      {entry.reflection && <p className="font-serif italic text-ink-muted">“{entry.reflection}”</p>}
    </Card>
  )
}
