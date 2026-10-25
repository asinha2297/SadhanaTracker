import { ACCOUNTS, PASSWORD, TEMPORARY_PASSWORD } from '@sadhana/fixtures'
import { loadConfig } from '../config'
import { loadDotEnv } from '../env'
import { connect } from './client'
import { accounts } from './schema'
import { demoSeedRefusal, seedFixtures } from './seedFixtures'

loadDotEnv()
const config = loadConfig()
const refusal = demoSeedRefusal(config)
if (refusal) {
  console.error(refusal)
  process.exit(1)
}

const database = await connect(config)
const [existing] = await database.db.select({ devoteeId: accounts.devoteeId }).from(accounts).limit(1)
if (existing) {
  console.log('The database already has accounts; nothing was seeded.')
} else {
  await seedFixtures(database.db, { argon: config.argon, entryDays: 120 })
  console.log(
    `Seeded ${ACCOUNTS.length} accounts (password "${PASSWORD}"; newcomer SH-0108 uses "${TEMPORARY_PASSWORD}") and 120 days of entries into ${config.databaseUrl ?? config.pgliteDir}.`,
  )
}
await database.close()
