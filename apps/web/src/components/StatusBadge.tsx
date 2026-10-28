import type { DayStatus } from '@sadhana/domain'
import { useT } from '../i18n'

const STYLES: Record<DayStatus, string> = {
  MISSING: 'bg-ink/8 text-ink-muted',
  ZERO_ENTRY: 'bg-saffron/12 text-saffron-text',
  RECORDED: 'bg-tulasi/12 text-tulasi',
}

export const STATUS_DOT: Record<DayStatus, string> = {
  MISSING: 'bg-ink/10',
  ZERO_ENTRY: 'bg-saffron/50',
  RECORDED: 'bg-tulasi',
}

export function StatusBadge({ status, label }: { status: DayStatus; label?: string }) {
  const t = useT()
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      {label ?? t.dayStatus[status]}
    </span>
  )
}
