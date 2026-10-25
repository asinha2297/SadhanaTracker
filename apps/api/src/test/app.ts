import { identifierOf, PASSWORD } from '@sadhana/fixtures'
import request, { type Agent } from 'supertest'
import { createApp } from '../app'
import { loadConfig, type Config } from '../config'
import { connect, type Db } from '../db/client'
import { seedFixtures } from '../db/seedFixtures'
import { createLogger } from '../logger'
import type { SentSms } from '../services/sms'

export interface TestContext {
  app: ReturnType<typeof createApp>
  db: Db
  config: Config
  /** Every SMS the app tried to send, newest last. */
  sms: SentSms[]
  close: () => Promise<void>
}

export async function testContext(): Promise<TestContext> {
  const config = loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' })
  const database = await connect({ migrationsFolder: config.migrationsFolder })
  await seedFixtures(database.db, { argon: config.argon, entryDays: 14 })
  const sms: SentSms[] = []
  const app = createApp({
    db: database.db,
    config,
    logger: createLogger('silent'),
    sms: { send: async (message) => void sms.push(message) },
  })
  return { app, db: database.db, config, sms, close: database.close }
}

export async function signedIn(ctx: TestContext, devoteeId: string, password = PASSWORD): Promise<Agent> {
  const agent = request.agent(ctx.app)
  await agent.post('/api/auth/login').send({ identifier: identifierOf(devoteeId), password }).expect(200)
  return agent
}

/** Requests a verification code for `phone` and reads it back from the SMS the app sent. */
export async function verifiedCode(ctx: TestContext, phone: string): Promise<string> {
  await request(ctx.app).post('/api/auth/otp').send({ phone }).expect(202)
  const code = /\b(\d{6})\b/.exec(ctx.sms.at(-1)?.message ?? '')?.[1]
  if (!code) throw new Error(`No code was sent to ${phone}`)
  return code
}
