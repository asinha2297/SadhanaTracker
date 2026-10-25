import type { LocalDate } from '@sadhana/domain'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api, requestJson } from './client'
import { DevoteeSummarySchema, GroupReportSchema, GroupSchema, MemberSchema, PublicGroupSchema, type Group } from './contract'

export const groupsQuery = queryOptions({
  queryKey: ['groups'],
  queryFn: async () => (await requestJson('/api/groups', z.object({ groups: z.array(GroupSchema) }))).groups,
})

export const publicGroupsQuery = queryOptions({
  queryKey: ['groups', 'public'],
  queryFn: async () => (await requestJson('/api/groups/public', z.object({ groups: z.array(PublicGroupSchema) }))).groups,
})

export const devoteesQuery = queryOptions({
  queryKey: ['devotees'],
  queryFn: async () => (await requestJson('/api/devotees', z.object({ devotees: z.array(DevoteeSummarySchema) }))).devotees,
})

export const reportQuery = (groupId: string, week: LocalDate) =>
  queryOptions({
    queryKey: ['groups', groupId, 'report', week],
    queryFn: async () =>
      (await requestJson(`/api/groups/${groupId}/report?week=${week}`, z.object({ report: GroupReportSchema }))).report,
  })

export const membersQuery = (groupId: string) =>
  queryOptions({
    queryKey: ['groups', groupId, 'members'],
    queryFn: async () =>
      (await requestJson(`/api/groups/${groupId}/members`, z.object({ members: z.array(MemberSchema) }))).members,
  })

export async function createGroup(name: string): Promise<Group> {
  return (await requestJson('/api/groups', z.object({ group: GroupSchema }), { method: 'POST', body: { name } })).group
}

export async function addMember(groupId: string, devoteeId: string): Promise<void> {
  await api(`/api/groups/${groupId}/members/${devoteeId}`, { method: 'PUT' })
}

export async function removeMember(groupId: string, devoteeId: string): Promise<void> {
  await api(`/api/groups/${groupId}/members/${devoteeId}`, { method: 'DELETE' })
}

export async function approveMember(groupId: string, devoteeId: string): Promise<void> {
  await api(`/api/groups/${groupId}/members/${devoteeId}/approve`, { method: 'POST' })
}

export type ExportFormat = 'csv' | 'xlsx'

export async function exportReport(
  groupId: string,
  from: LocalDate,
  to: LocalDate,
  format: ExportFormat,
): Promise<{ blob: Blob; filename: string }> {
  const response = await api(`/api/groups/${groupId}/export?from=${from}&to=${to}&format=${format}`)
  const filename =
    /filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '')?.[1] ??
    `sadhana-${groupId}-${from}-${to}.${format}`
  return { blob: await response.blob(), filename }
}
