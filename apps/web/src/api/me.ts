import type { DailyEntry, LocalDate, TargetChoice, TargetHistory } from '@sadhana/domain'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { requestJson } from './client'
import {
  EntryRecordSchema,
  ProfileSchema,
  RemindersSchema,
  TargetHistorySchema,
  type EntryRecord,
  type Profile,
  type ProfileInput,
  type Reminders,
} from './contract'

export interface PutEntryMeta {
  clientUpdatedAt: string
  baseUpdatedAt?: string | undefined
  idempotencyKey: string
}

export const ConflictSchema = z.object({ entry: EntryRecordSchema })
const ProfileResponse = z.object({ profile: ProfileSchema })
const RemindersResponse = z.object({ reminders: RemindersSchema })

export const entriesQuery = (from: LocalDate, to: LocalDate) =>
  queryOptions({
    queryKey: ['me', 'entries', from, to],
    queryFn: async () =>
      (await requestJson(`/api/me/entries?from=${from}&to=${to}`, z.object({ entries: z.array(EntryRecordSchema) })))
        .entries,
  })

export async function putEntry(entry: DailyEntry, meta: PutEntryMeta): Promise<EntryRecord> {
  return (
    await requestJson(`/api/me/entries/${entry.localDate}`, ConflictSchema, {
      method: 'PUT',
      body: { ...entry, clientUpdatedAt: meta.clientUpdatedAt, baseUpdatedAt: meta.baseUpdatedAt },
      headers: { 'Idempotency-Key': meta.idempotencyKey },
    })
  ).entry
}

export const targetsQuery = queryOptions({
  queryKey: ['me', 'targets'],
  queryFn: () => requestJson('/api/me/targets', TargetHistorySchema),
})

export function postTargetChoice(choice: TargetChoice): Promise<TargetHistory> {
  return requestJson('/api/me/targets', TargetHistorySchema, { method: 'POST', body: choice })
}

export const profileQuery = queryOptions({
  queryKey: ['me', 'profile'],
  queryFn: async () => (await requestJson('/api/me/profile', ProfileResponse)).profile,
})

export async function putProfile(input: ProfileInput): Promise<Profile> {
  return (await requestJson('/api/me/profile', ProfileResponse, { method: 'PUT', body: input })).profile
}

export const remindersQuery = queryOptions({
  queryKey: ['me', 'reminders'],
  queryFn: async () => (await requestJson('/api/me/reminders', RemindersResponse)).reminders,
})

export async function putReminders(input: Reminders): Promise<Reminders> {
  return (await requestJson('/api/me/reminders', RemindersResponse, { method: 'PUT', body: input })).reminders
}
