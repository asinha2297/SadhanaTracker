import { hashPassword } from '../auth/password'
import type { Config } from '../config'
import { todayIn } from '../lib/dates'
import type { Logger } from '../logger'
import type { Db } from './client'
import { accounts } from './schema'

export async function bootstrapAdmin(db: Db, config: Config, logger: Logger): Promise<void> {
  if (!config.bootstrapAdmin) return
  const [existing] = await db.select({ devoteeId: accounts.devoteeId }).from(accounts).limit(1)
  if (existing) return
  await db.insert(accounts).values({
    devoteeId: 'SH-0001',
    name: 'Administrator',
    role: 'ADMIN',
    mustChangePassword: true,
    passwordHash: await hashPassword(config.bootstrapAdmin.password, config.argon),
    groupId: null,
    joinedAt: todayIn('Asia/Kolkata'),
    phone: config.bootstrapAdmin.phone,
  })
  logger.warn(
    `Bootstrapped administrator SH-0001, signing in with ${config.bootstrapAdmin.phone} and BOOTSTRAP_ADMIN_PASSWORD; change it on first sign-in`,
  )
}
