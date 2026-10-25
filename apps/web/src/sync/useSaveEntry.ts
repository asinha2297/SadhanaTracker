import { idempotencyKey, type DailyEntry } from '@sadhana/domain'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import type { EntryRecord } from '../api/contract'
import { ConflictSchema, putEntry } from '../api/me'
import { useUser } from '../auth/AuthContext'
import { useSync } from './SyncContext'

export type SaveOutcome = { outcome: 'saved' | 'queued' | 'rejected' } | { outcome: 'conflict'; server: EntryRecord }

export function useSaveEntry() {
  const user = useUser()
  const sync = useSync()
  const queryClient = useQueryClient()

  return async (entry: DailyEntry, baseUpdatedAt: string | undefined): Promise<SaveOutcome> => {
    const clientUpdatedAt = new Date().toISOString()
    const key = idempotencyKey(user.devoteeId, entry.localDate, clientUpdatedAt)
    try {
      await putEntry(entry, { clientUpdatedAt, baseUpdatedAt, idempotencyKey: key })
      await sync.remove(entry.localDate)
      await queryClient.invalidateQueries({ queryKey: ['me', 'entries'] })
      return { outcome: 'saved' }
    } catch (error) {
      if (error instanceof ApiError) {
        return error.status === 409
          ? { outcome: 'conflict', server: ConflictSchema.parse(error.body).entry }
          : { outcome: 'rejected' }
      }
      await sync.enqueue({ devoteeId: user.devoteeId, entry, clientUpdatedAt, baseUpdatedAt, idempotencyKey: key })
      return { outcome: 'queued' }
    }
  }
}
