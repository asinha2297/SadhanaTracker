import { addDays } from '@sadhana/domain'
import { ACCOUNTS, AUDIT, generatedEntry, PERSONAL, RECOMMENDED, RESET_REQUESTS } from '@sadhana/fixtures'
import { hashPassword } from '../auth/password'
import type { ArgonOptions, Config } from '../config'
import { todayIn } from '../lib/dates'
import type { Db } from './client'
import * as t from './schema'

/** Why demo accounts (with publicly known passwords) must not be planted in this database, if they must not. */
export function demoSeedRefusal(config: Config): string | undefined {
  if (config.nodeEnv === 'production') return 'Refusing to seed demo data in production.'
  if (config.databaseUrl && !config.allowDemoSeed) {
    return 'Refusing to seed demo accounts into DATABASE_URL; set ALLOW_DEMO_SEED=true if this database is disposable.'
  }
  return undefined
}

export interface SeedOptions {
  argon: ArgonOptions
  entryDays: number
}

export async function seedFixtures(db: Db, options: SeedOptions): Promise<void> {
  await db.insert(t.accounts).values(
    await Promise.all(
      ACCOUNTS.map(async (account) => ({
        devoteeId: account.devoteeId,
        name: account.name,
        role: account.role,
        active: account.active,
        mustChangePassword: account.mustChangePassword,
        passwordHash: await hashPassword(account.password, options.argon),
        canReviewRecords: account.canReviewRecords,
        joinedAt: account.joinedAt,
        phone: account.phone,
        email: account.email ?? null,
        address: account.address ?? null,
      })),
    ),
  )

  await db.insert(t.recommendedTargets).values(
    RECOMMENDED.map((item) => ({ effectiveDate: item.effectiveDate, ...item.target })),
  )

  await db.insert(t.targetChoices).values(
    Object.entries(PERSONAL).flatMap(([devoteeId, choices]) =>
      choices.map((choice) => ({
        devoteeId,
        effectiveDate: choice.effectiveDate,
        kind: choice.kind,
        rounds: choice.kind === 'PERSONAL' ? choice.target.rounds : null,
        readingMinutes: choice.kind === 'PERSONAL' ? choice.target.readingMinutes : null,
        hearingMinutes: choice.kind === 'PERSONAL' ? choice.target.hearingMinutes : null,
      })),
    ),
  )

  await db
    .insert(t.reminders)
    .values({ devoteeId: 'SH-0042', enabled: true, time: '21:00', timeZone: 'Asia/Kolkata', channel: 'IN_APP' })

  await db.insert(t.resetRequests).values(
    RESET_REQUESTS.map((request) => ({ devoteeId: request.devoteeId, requestedAt: new Date(request.requestedAt) })),
  )

  await db.insert(t.auditEvents).values(
    [...AUDIT].reverse().map((event) => ({
      at: new Date(event.at),
      actor: event.actor,
      action: event.action,
      subject: event.subject ?? null,
      details: event.details ?? null,
    })),
  )

  const today = todayIn('Asia/Kolkata')
  const rows: (typeof t.entries.$inferInsert)[] = []
  for (const account of ACCOUNTS.filter((candidate) => candidate.active)) {
    for (let date = addDays(today, -options.entryDays); date < today; date = addDays(date, 1)) {
      const entry = generatedEntry(account.devoteeId, date)
      if (!entry) continue
      rows.push({
        devoteeId: account.devoteeId,
        localDate: date,
        rounds: entry.rounds,
        reflection: entry.reflection ?? null,
        reading: entry.reading,
        hearing: entry.hearing,
        updatedAt: new Date(`${date}T16:30:00.000Z`),
      })
    }
  }
  for (let start = 0; start < rows.length; start += 200) {
    await db.insert(t.entries).values(rows.slice(start, start + 200))
  }
}
