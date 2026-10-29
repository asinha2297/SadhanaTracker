import { describe, expect, it } from 'vitest'
import { loadConfig } from './config'
import { demoSeedRefusal } from './db/seedFixtures'

const SECRET = 'a-test-secret-that-is-long-enough-123'

describe('loadConfig', () => {
  it('treats a missing NODE_ENV as production and then demands a session secret', () => {
    expect(() => loadConfig({})).toThrow(/SESSION_SECRET/)
    expect(loadConfig({ SESSION_SECRET: SECRET }).nodeEnv).toBe('production')
  })

  it('needs no SMS settings: mobile numbers are not verified by text', () => {
    expect(loadConfig({ SESSION_SECRET: SECRET })).not.toHaveProperty('sms')
  })

  it('has no built-in secret outside tests', () => {
    expect(() => loadConfig({ NODE_ENV: 'development' })).toThrow(/SESSION_SECRET/)
    expect(() => loadConfig({ NODE_ENV: 'development', SESSION_SECRET: 'short' })).toThrow()
    expect(loadConfig({ NODE_ENV: 'test' }).sessionSecret.length).toBeGreaterThanOrEqual(32)
  })

  it('sends Secure cookies everywhere except development and tests', () => {
    expect(loadConfig({ SESSION_SECRET: SECRET }).cookieSecure).toBe(true)
    expect(loadConfig({ NODE_ENV: 'development', SESSION_SECRET: SECRET }).cookieSecure).toBe(false)
    expect(loadConfig({ NODE_ENV: 'development', SESSION_SECRET: SECRET, COOKIE_SECURE: 'true' }).cookieSecure).toBe(true)
  })

  it('treats blank lines in .env as unset', () => {
    const config = loadConfig({ NODE_ENV: 'development', SESSION_SECRET: SECRET, DATABASE_URL: '', TRUST_PROXY: '' })
    expect(config.databaseUrl).toBeUndefined()
    expect(config.trustProxy).toBe(false)
    expect(() => loadConfig({ NODE_ENV: 'development', SESSION_SECRET: '' })).toThrow(/SESSION_SECRET \(at least 32/)
  })

  it('trusts exactly the proxies it is told about', () => {
    const trust = (TRUST_PROXY?: string) => loadConfig({ NODE_ENV: 'test', TRUST_PROXY }).trustProxy
    expect(trust()).toBe(false)
    expect(trust('false')).toBe(false)
    expect(trust('true')).toBe(1)
    expect(trust('2')).toBe(2)
    expect(trust('loopback, 10.0.0.0/8')).toBe('loopback, 10.0.0.0/8')
  })
})

describe('demoSeedRefusal', () => {
  const config = (env: Record<string, string>) => loadConfig({ SESSION_SECRET: SECRET, ...env })

  it('never seeds demo accounts in production', () => {
    expect(demoSeedRefusal(config({}))).toMatch(/production/)
  })

  it('seeds an external database only when explicitly allowed', () => {
    const external = { NODE_ENV: 'development', DATABASE_URL: 'postgres://localhost/sadhana' }
    expect(demoSeedRefusal(config(external))).toMatch(/ALLOW_DEMO_SEED/)
    expect(demoSeedRefusal(config({ ...external, ALLOW_DEMO_SEED: 'true' }))).toBeUndefined()
    expect(demoSeedRefusal(config({ NODE_ENV: 'development' }))).toBeUndefined()
  })
})
