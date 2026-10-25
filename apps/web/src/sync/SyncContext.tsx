import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Outlet } from 'react-router'
import { ApiError } from '../api/client'
import type { EntryRecord } from '../api/contract'
import { ConflictSchema, putEntry } from '../api/me'
import { useUser } from '../auth/AuthContext'
import { useOnline } from '../lib/online'
import { dequeue, enqueue, pending, queueId, type QueuedEntry } from '../lib/syncQueue'

export interface SyncProblem {
  queued: QueuedEntry
  server?: EntryRecord
}

export interface SyncValue {
  online: boolean
  queue: QueuedEntry[]
  problems: SyncProblem[]
  enqueue: (item: Omit<QueuedEntry, 'id'>) => Promise<void>
  remove: (localDate: string) => Promise<void>
  resolve: (localDate: string) => void
}

const SyncContext = createContext<SyncValue | undefined>(undefined)

export function SyncProvider({ children }: { children: ReactNode }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const online = useOnline()
  const [queue, setQueue] = useState<QueuedEntry[]>([])
  const [problems, setProblems] = useState<SyncProblem[]>([])

  const refresh = useCallback(async () => setQueue(await pending(user.devoteeId)), [user.devoteeId])

  useEffect(() => {
    let cancelled = false
    const flush = async () => {
      let changed = false
      for (const item of await pending(user.devoteeId)) {
        if (cancelled) return
        try {
          await putEntry(item.entry, item)
        } catch (error) {
          if (!(error instanceof ApiError)) break
          const server = error.status === 409 ? ConflictSchema.parse(error.body).entry : undefined
          setProblems((current) => [...current, { queued: item, server }])
        }
        await dequeue(item.id)
        changed = true
      }
      if (cancelled) return
      await refresh()
      if (changed) await queryClient.invalidateQueries({ queryKey: ['me', 'entries'] })
    }
    void (online ? flush() : refresh())
    return () => {
      cancelled = true
    }
  }, [online, user.devoteeId, queryClient, refresh])

  const value: SyncValue = {
    online,
    queue,
    problems,
    enqueue: async (item) => {
      await enqueue(item)
      await refresh()
    },
    remove: async (localDate) => {
      await dequeue(queueId(user.devoteeId, localDate))
      await refresh()
    },
    resolve: (localDate) =>
      setProblems((current) => current.filter((problem) => problem.queued.entry.localDate !== localDate)),
  }

  return <SyncContext value={value}>{children}</SyncContext>
}

export function SyncLayout() {
  return (
    <SyncProvider>
      <Outlet />
    </SyncProvider>
  )
}

export function useSync(): SyncValue {
  const value = useContext(SyncContext)
  if (!value) throw new Error('useSync must be used inside SyncProvider')
  return value
}
