import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../lib/motion'
import { useSync } from '../sync/SyncContext'

export function SyncBadge() {
  const { online, queue } = useSync()
  const reduced = usePrefersReducedMotion()
  const state = !online
    ? { label: queue.length ? `Offline · ${queue.length} pending` : 'Offline', dot: 'bg-ink-muted', pulse: true }
    : queue.length
      ? { label: `Pending sync · ${queue.length}`, dot: 'bg-saffron', pulse: true }
      : { label: 'Synced', dot: 'bg-peacock', pulse: false }
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 rounded-full border border-line bg-card/70 px-2.5 py-1 text-xs font-medium text-ink-muted"
    >
      <motion.span
        className={`size-2 rounded-full ${state.dot}`}
        animate={state.pulse && !reduced ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />
      {state.label}
    </span>
  )
}
