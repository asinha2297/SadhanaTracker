import { resolve } from 'node:path'
import { normalizePhone } from '@sadhana/domain'
import { z } from 'zod'

const EnvSchema = z.object({
  // Unset means production: a forgotten variable must never switch security off.
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().optional(),
  PGLITE_DIR: z.string().default('./data/sadhana'),
  MIGRATIONS_DIR: z.string().default('./drizzle'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters').optional(),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  TRUST_PROXY: z.string().default('false'),
  WEB_DIST: z.string().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8).optional(),
  BOOTSTRAP_ADMIN_PHONE: z.string().optional(),
  ALLOW_DEMO_SEED: z.enum(['true', 'false']).default('false'),
  LOG_LEVEL: z.string().default('info'),
})

export interface ArgonOptions {
  memoryCost: number
  timeCost: number
}

export interface BootstrapAdmin {
  password: string
  phone: string
}

export interface Config {
  nodeEnv: 'development' | 'test' | 'production'
  port: number
  databaseUrl: string | undefined
  pgliteDir: string | undefined
  migrationsFolder: string
  sessionSecret: Uint8Array
  cookieSecure: boolean
  trustProxy: boolean | number | string
  webDist: string | undefined
  bootstrapAdmin: BootstrapAdmin | undefined
  allowDemoSeed: boolean
  logLevel: string
  argon: ArgonOptions
}

const TEST_SECRET = 'test-only-session-secret-never-used-outside-vitest'

function bootstrapAdminOf(password: string | undefined, phone: string | undefined): BootstrapAdmin | undefined {
  if (!password) return undefined
  const mobile = normalizePhone(phone ?? '')
  if (!mobile) throw new Error('BOOTSTRAP_ADMIN_PHONE (the first administrator’s mobile number) is required with BOOTSTRAP_ADMIN_PASSWORD')
  return { password, phone: mobile }
}

/** `true` means the one reverse proxy in front of us; a number is a hop count; any other text is Express's address list. */
function trustProxyOf(value: string): boolean | number | string {
  if (value === 'false') return false
  if (value === 'true') return 1
  return /^\d+$/.test(value) ? Number(value) : value
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  // `KEY=` in .env means "not set", not "set to nothing".
  const parsed = EnvSchema.parse(Object.fromEntries(Object.entries(env).filter(([, value]) => value !== '')))
  const testing = parsed.NODE_ENV === 'test'
  const secret = parsed.SESSION_SECRET ?? (testing ? TEST_SECRET : undefined)
  if (!secret) {
    throw new Error(
      'SESSION_SECRET (at least 32 random characters) is required. Copy apps/api/.env.example to apps/api/.env, or set it in the environment.',
    )
  }
  const relaxed = testing || parsed.NODE_ENV === 'development'
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    pgliteDir: testing ? undefined : resolve(parsed.PGLITE_DIR),
    migrationsFolder: resolve(parsed.MIGRATIONS_DIR),
    sessionSecret: new TextEncoder().encode(secret),
    cookieSecure: parsed.COOKIE_SECURE ? parsed.COOKIE_SECURE === 'true' : !relaxed,
    trustProxy: trustProxyOf(parsed.TRUST_PROXY),
    webDist: parsed.WEB_DIST ? resolve(parsed.WEB_DIST) : undefined,
    bootstrapAdmin: bootstrapAdminOf(parsed.BOOTSTRAP_ADMIN_PASSWORD, parsed.BOOTSTRAP_ADMIN_PHONE),
    allowDemoSeed: parsed.ALLOW_DEMO_SEED === 'true',
    logLevel: parsed.LOG_LEVEL,
    argon: testing ? { memoryCost: 1024, timeCost: 1 } : { memoryCost: 19_456, timeCost: 2 },
  }
}
