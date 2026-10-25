import { EffectiveTargetSchema, type EffectiveTarget } from '@sadhana/domain'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { requestJson } from './client'
import {
  AuditEventSchema,
  CreatedDevoteeSchema,
  MemberSchema,
  PendingResetSchema,
  type CreatedDevotee,
  type DevoteePatch,
  type Member,
  type NewDevoteeInput,
} from './contract'

export const resetRequestsQuery = queryOptions({
  queryKey: ['admin', 'reset-requests'],
  queryFn: async () =>
    (await requestJson('/api/admin/reset-requests', z.object({ requests: z.array(PendingResetSchema) }))).requests,
})

export const auditQuery = queryOptions({
  queryKey: ['admin', 'audit'],
  queryFn: async () => (await requestJson('/api/admin/audit', z.object({ events: z.array(AuditEventSchema) }))).events,
})

export function createDevotee(input: NewDevoteeInput): Promise<CreatedDevotee> {
  return requestJson('/api/admin/devotees', CreatedDevoteeSchema, { method: 'POST', body: input })
}

export async function patchDevotee(devoteeId: string, patch: DevoteePatch): Promise<Member> {
  return (
    await requestJson(`/api/admin/devotees/${devoteeId}`, z.object({ devotee: MemberSchema }), {
      method: 'PATCH',
      body: patch,
    })
  ).devotee
}

export async function issuePassword(devoteeId: string): Promise<string> {
  return (
    await requestJson(`/api/admin/devotees/${devoteeId}/reset-password`, z.object({ temporaryPassword: z.string() }), {
      method: 'POST',
    })
  ).temporaryPassword
}

export async function postRecommendedTarget(target: EffectiveTarget): Promise<EffectiveTarget[]> {
  return (
    await requestJson('/api/admin/targets', z.object({ recommended: z.array(EffectiveTargetSchema) }), {
      method: 'POST',
      body: target,
    })
  ).recommended
}
