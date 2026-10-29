import { identifierOf, PASSWORD } from '@sadhana/fixtures'
import request, { type Agent } from 'supertest'
import { createApp } from '../app'
import { loadConfig, type Config } from '../config'
import { connect, type Db } from '../db/client'
import { seedFixtures } from '../db/seedFixtures'
import { createLogger } from '../logger'

export interface TestContext {
  app: ReturnType<typeof createApp>
  db: Db
  config: Config
  close: () => Promise<void>
}

export async function testContext(): Promise<TestContext> {
  const config = loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' })
  const database = await connect({ migrationsFolder: config.migrationsFolder })
  await seedFixtures(database.db, { argon: config.argon, entryDays: 14 })
  const app = createApp({ db: database.db, config, logger: createLogger('silent') })
  return { app, db: database.db, config, close: database.close }
}

export async function signedIn(ctx: TestContext, devoteeId: string, password = PASSWORD): Promise<Agent> {
  const agent = request.agent(ctx.app)
  await agent.post('/api/auth/login').send({ identifier: identifierOf(devoteeId), password }).expect(200)
  return agent
}
