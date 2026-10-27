import type { LocalDate } from '@sadhana/domain'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api, requestJson } from './client'
import { ReportSchema } from './contract'

export const reportQuery = (week: LocalDate) =>
  queryOptions({
    queryKey: ['report', week],
    queryFn: async () => (await requestJson(`/api/report?week=${week}`, z.object({ report: ReportSchema }))).report,
  })

export type ExportFormat = 'csv' | 'xlsx'

export async function exportReport(from: LocalDate, to: LocalDate, format: ExportFormat): Promise<{ blob: Blob; filename: string }> {
  const response = await api(`/api/export?from=${from}&to=${to}&format=${format}`)
  const filename =
    /filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '')?.[1] ?? `sadhana-${from}-${to}.${format}`
  return { blob: await response.blob(), filename }
}
