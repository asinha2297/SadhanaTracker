import type { LocalDate } from '@sadhana/domain'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { EntryRecord } from '../api/contract'
import { entriesQuery } from '../api/me'
import { useSync } from './SyncContext'

export function useEntries(from: LocalDate, to: LocalDate) {
  const query = useQuery(entriesQuery(from, to))
  const { queue } = useSync()

  const entries = useMemo(() => {
    if (!query.data) return undefined
    const byDate = new Map<LocalDate, EntryRecord>(query.data.map((entry) => [entry.localDate, entry]))
    for (const item of queue) {
      if (item.entry.localDate >= from && item.entry.localDate <= to) {
        byDate.set(item.entry.localDate, { ...item.entry, updatedAt: item.clientUpdatedAt })
      }
    }
    return [...byDate.values()].sort((a, b) => a.localDate.localeCompare(b.localDate))
  }, [query.data, queue, from, to])

  const pendingDates = useMemo(() => new Set(queue.map((item) => item.entry.localDate)), [queue])

  return { query, entries, pendingDates }
}
