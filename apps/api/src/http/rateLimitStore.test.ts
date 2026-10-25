import type { Options } from 'express-rate-limit'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { testContext, type TestContext } from '../test/app'
import { DbRateLimitStore } from './rateLimitStore'

let ctx: TestContext
beforeAll(async () => {
  ctx = await testContext()
})
afterAll(() => ctx.close())

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('DbRateLimitStore', () => {
  it('counts hits per key within a window and starts over after it', async () => {
    const store = new DbRateLimitStore(ctx.db, 'test')
    store.init({ windowMs: 200 } as Options)
    expect((await store.increment('a')).totalHits).toBe(1)
    const second = await store.increment('a')
    expect(second.totalHits).toBe(2)
    expect(second.resetTime?.getTime()).toBeGreaterThan(Date.now())
    expect((await store.increment('b')).totalHits).toBe(1)
    await store.decrement('a')
    expect((await store.increment('a')).totalHits).toBe(2)
    await store.resetKey('a')
    expect((await store.increment('a')).totalHits).toBe(1)
    await sleep(250)
    expect((await store.increment('a')).totalHits).toBe(1)
  })

  it('keeps limiters apart by prefix', async () => {
    const login = new DbRateLimitStore(ctx.db, 'login')
    const signup = new DbRateLimitStore(ctx.db, 'signup')
    login.init({ windowMs: 60_000 } as Options)
    signup.init({ windowMs: 60_000 } as Options)
    await login.increment('ip')
    await login.increment('ip')
    expect((await signup.increment('ip')).totalHits).toBe(1)
  })
})
