import { describe, expect, it } from 'vitest'
import { loadConfig } from './config'
import { demoSeedRefusal } from './db/seedFixtures'

const SECRET = 'a-test-secret-that-is-long-enough-123'

describe('loadConfig', () => {
  it('treats a missing NODE_ENV as production and then demands a session secret', () => {
    expect(() => loadConfig({})).toThrow(/SESSION_SECRET/)
    expect(loadConfig({ SESSION_SECRET: SECRET, SMS_PROVIDER: 'log' }).nodeEnv).toBe('production')
  })

  it('has no built-in secret outside tests', () => {
    expect(() => loadConfig({ NODE_ENV: 'development' })).toThrow(/SESSION_SECRET/)
    expect(() => loadConfig({ NODE_ENV: 'development', SESSION_SECRET: 'short' })).toThrow()
    expect(loadConfig({ NODE_ENV: 'test' }).sessionSecret.length).toBeGreaterThanOrEqual(32)
  })

  it('sends Secure cookies everywhere except development and tests', () => {
    expect(loadConfig({ SESSION_SECRET: SECRET, SMS_PROVIDER: 'log' }).cookieSecure).toBe(true)
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
  const config = (env: Record<string, string>) => loadConfig({ SESSION_SECRET: SECRET, SMS_PROVIDER: 'log', ...env })

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

describe('SMS', () => {
  it('logs codes in development and demands a real sender, or an explicit choice, in production', () => {
    expect(loadConfig({ NODE_ENV: 'development', SESSION_SECRET: SECRET }).sms).toEqual({ provider: 'log' })
    expect(() => loadConfig({ SESSION_SECRET: SECRET })).toThrow(/SMS_PROVIDER/)
    expect(loadConfig({ SESSION_SECRET: SECRET, SMS_PROVIDER: 'log' }).sms).toEqual({ provider: 'log' })
    expect(() => loadConfig({ SESSION_SECRET: SECRET, SMS_PROVIDER: 'twilio' })).toThrow(/TWILIO_/)
    expect(
      loadConfig({
        SESSION_SECRET: SECRET,
        SMS_PROVIDER: 'twilio',
        TWILIO_ACCOUNT_SID: 'AC1',
        TWILIO_AUTH_TOKEN: 'token',
        TWILIO_FROM: '+15550001',
      }).sms,
    ).toEqual({ provider: 'twilio', accountSid: 'AC1', authToken: 'token', from: '+15550001' })
  })
})
