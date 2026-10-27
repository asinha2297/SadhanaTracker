import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { requestJson } from './client'
import {
  AccountSchema,
  CreatedDevoteeSchema,
  PendingResetSchema,
  type Account,
  type CreatedDevotee,
  type DevoteePatch,
  type NewDevoteeInput,
} from './contract'

export const accountsQuery = queryOptions({
  queryKey: ['accounts'],
  queryFn: async () => (await requestJson('/api/devotees', z.object({ devotees: z.array(AccountSchema) }))).devotees,
})

export const resetRequestsQuery = queryOptions({
  queryKey: ['accounts', 'reset-requests'],
  queryFn: async () =>
    (await requestJson('/api/devotees/reset-requests', z.object({ requests: z.array(PendingResetSchema) }))).requests,
})

export function createDevotee(input: NewDevoteeInput): Promise<CreatedDevotee> {
  return requestJson('/api/devotees', CreatedDevoteeSchema, { method: 'POST', body: input })
}

export async function patchDevotee(devoteeId: string, patch: DevoteePatch): Promise<Account> {
  return (await requestJson(`/api/devotees/${devoteeId}`, z.object({ devotee: AccountSchema }), { method: 'PATCH', body: patch })).devotee
}

export async function issuePassword(devoteeId: string): Promise<string> {
  return (
    await requestJson(`/api/devotees/${devoteeId}/reset-password`, z.object({ temporaryPassword: z.string() }), { method: 'POST' })
  ).temporaryPassword
}
