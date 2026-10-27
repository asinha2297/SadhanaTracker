import { EffectiveTargetSchema, type EffectiveTarget } from '@sadhana/domain'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { requestJson } from './client'
import { AuditEventSchema } from './contract'

export const auditQuery = queryOptions({
  queryKey: ['admin', 'audit'],
  queryFn: async () => (await requestJson('/api/admin/audit', z.object({ events: z.array(AuditEventSchema) }))).events,
})

export async function postRecommendedTarget(target: EffectiveTarget): Promise<EffectiveTarget[]> {
  return (
    await requestJson('/api/admin/targets', z.object({ recommended: z.array(EffectiveTargetSchema) }), {
      method: 'POST',
      body: target,
    })
  ).recommended
}
