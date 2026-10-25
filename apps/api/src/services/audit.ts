import type { Db } from '../db/client'
import { auditEvents } from '../db/schema'

export const label = (account: { name: string; devoteeId: string }) => `${account.name} (${account.devoteeId})`

export async function recordAudit(
  db: Db,
  actor: { name: string; devoteeId: string },
  action: string,
  subject?: string,
  details?: string,
): Promise<void> {
  await db.insert(auditEvents).values({ actor: label(actor), action, subject: subject ?? null, details: details ?? null })
}
