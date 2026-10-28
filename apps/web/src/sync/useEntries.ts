import type { DailyEntry, LocalDate } from '@sadhana/domain'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { EntryRecord } from '../api/contract'
import { libraryQuery } from '../api/library'
import { entriesQuery } from '../api/me'
import { useSync } from './SyncContext'

export function useEntries(from: LocalDate, to: LocalDate) {
  const query = useQuery(entriesQuery(from, to))
  const library = useQuery(libraryQuery)
  const { queue } = useSync()

  const entries = useMemo(() => {
    if (!query.data) return undefined
    const books = new Map(library.data?.books.map((book) => [book.id, book]))
    const lectures = new Map(library.data?.lectures.map((lecture) => [lecture.id, lecture]))
    // An entry still waiting to sync holds ids alone; the library lends it the names a record carries.
    const describe = (entry: DailyEntry, updatedAt: string): EntryRecord => ({
      ...entry,
      updatedAt,
      reading: entry.reading.map((session) => ({ ...session, bookTitle: books.get(session.bookId)?.title ?? '' })),
      hearing: entry.hearing.map((session) => {
        const lecture = lectures.get(session.lectureId)
        return { ...session, lectureTitle: lecture?.title ?? '', speaker: lecture?.speaker, source: lecture?.source }
      }),
    })
    const byDate = new Map<LocalDate, EntryRecord>(query.data.map((entry) => [entry.localDate, entry]))
    for (const item of queue) {
      if (item.entry.localDate >= from && item.entry.localDate <= to) {
        byDate.set(item.entry.localDate, describe(item.entry, item.clientUpdatedAt))
      }
    }
    return [...byDate.values()].sort((a, b) => a.localDate.localeCompare(b.localDate))
  }, [query.data, library.data, queue, from, to])

  const pendingDates = useMemo(() => new Set(queue.map((item) => item.entry.localDate)), [queue])

  return { query, entries, pendingDates }
}
