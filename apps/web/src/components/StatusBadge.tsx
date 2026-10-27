import type { DayStatus } from '@sadhana/domain'

const STYLES: Record<DayStatus, string> = {
  MISSING: 'bg-ink/8 text-ink-muted',
  ZERO_ENTRY: 'bg-saffron/12 text-saffron-text',
  RECORDED: 'bg-tulasi/12 text-tulasi',
}

export const STATUS_LABELS: Record<DayStatus, string> = {
  MISSING: 'Missing',
  ZERO_ENTRY: 'Zero day',
  RECORDED: 'Recorded',
}

export const STATUS_DOT: Record<DayStatus, string> = {
  MISSING: 'bg-ink/10',
  ZERO_ENTRY: 'bg-saffron/50',
  RECORDED: 'bg-tulasi',
}

export function StatusBadge({ status, label = STATUS_LABELS[status] }: { status: DayStatus; label?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      {label}
    </span>
  )
}
