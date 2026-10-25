import type { DailyEntry } from '@sadhana/domain'
import { openDB, type DBSchema } from 'idb'

export interface QueuedEntry {
  id: string
  devoteeId: string
  entry: DailyEntry
  clientUpdatedAt: string
  baseUpdatedAt?: string
  idempotencyKey: string
}

interface SadhanaDb extends DBSchema {
  sync_queue: { key: string; value: QueuedEntry; indexes: { byDevotee: string } }
}

const open = () =>
  openDB<SadhanaDb>('sadhana', 1, {
    upgrade(database) {
      database.createObjectStore('sync_queue', { keyPath: 'id' }).createIndex('byDevotee', 'devoteeId')
    },
  })

export const queueId = (devoteeId: string, localDate: string) => `${devoteeId}|${localDate}`

export async function enqueue(item: Omit<QueuedEntry, 'id'>): Promise<void> {
  const database = await open()
  const id = queueId(item.devoteeId, item.entry.localDate)
  const existing = await database.get('sync_queue', id)
  await database.put('sync_queue', { ...item, id, baseUpdatedAt: existing ? existing.baseUpdatedAt : item.baseUpdatedAt })
  database.close()
}

export async function pending(devoteeId: string): Promise<QueuedEntry[]> {
  const database = await open()
  const items = await database.getAllFromIndex('sync_queue', 'byDevotee', devoteeId)
  database.close()
  return items
}

/** Forgets every queued entry on this device, whoever recorded it. */
export async function clearQueue(): Promise<void> {
  const database = await open()
  await database.clear('sync_queue')
  database.close()
}

export async function dequeue(id: string): Promise<void> {
  const database = await open()
  await database.delete('sync_queue', id)
  database.close()
}
