import { PASSWORD, TEMPORARY_PASSWORD } from '@sadhana/fixtures'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app'
import type { Db } from '../db/client'
import { createLogger } from '../logger'
import { signedIn, testContext, type TestContext } from '../test/app'

let ctx: TestContext
beforeAll(async () => {
  ctx = await testContext()
})
afterAll(() => ctx.close())

const login = (identifier: string, password: string) =>
  request(ctx.app).post('/api/auth/login').send({ identifier, password })

describe('health', () => {
  it('reports ok', async () => {
    await request(ctx.app).get('/api/health').expect(200, { ok: true })
  })

  it('reports 503 when the database does not answer, so an uptime monitor notices', async () => {
    const down = { execute: () => Promise.reject(new Error('connection refused')) } as unknown as Db
    const app = createApp({ db: down, config: ctx.config, logger: createLogger('silent') })
    await request(app).get('/api/health').expect(503, { ok: false })
  })
})

describe('sessions', () => {
  it('is 401 without a cookie', async () => {
    await request(ctx.app).get('/api/auth/session').expect(401)
  })

  it('signs a devotee in by email with an HttpOnly, SameSite cookie and reports the session', async () => {
    const agent = request.agent(ctx.app)
    const response = await agent.post('/api/auth/login').send({ identifier: 'Radhika@Example.org', password: PASSWORD }).expect(200)
    expect(response.body.user).toEqual({
      devoteeId: 'SH-0042',
      name: 'Rādhikā Devī Dāsī',
      role: 'DEVOTEE',
      mustChangePassword: false,
    })
    const cookie = String(response.headers['set-cookie'])
    expect(cookie).toMatch(/sadhana_session=/)
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/SameSite=Lax/)
    const session = await agent.get('/api/auth/session').expect(200)
    expect(session.body.user.devoteeId).toBe('SH-0042')
  })

  it('signs in by mobile number written any usual way', async () => {
    for (const identifier of ['98765 43210', '098765-43210', '+91 98765 43210']) {
      const response = await login(identifier, PASSWORD).expect(200)
      expect(response.body.user.devoteeId).toBe('SH-0042')
    }
  })

  it('tells a wrong password, an unknown identifier and an inactive account apart', async () => {
    await login('radhika@example.org', 'wrong').expect(401)
    await login('nobody@example.org', PASSWORD).expect(401)
    await login('not an identifier', PASSWORD).expect(401)
    await login('+919845000099', PASSWORD).expect(403, { reason: 'INACTIVE' })
  })

  it('no longer offers public sign-up', async () => {
    await request(ctx.app)
      .post('/api/auth/signup')
      .send({ name: 'Haridāsa Dāsa', phone: '98450 00200', password: 'govinda-jaya', code: '123456' })
      .expect(404)
  })

  it('rate-limits repeated failures for the same identifier', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) await login('+919845000043', 'wrong').expect(401)
    await login('+919845000043', PASSWORD).expect(429)
  })

  it('signs out and clears the cookie', async () => {
    const agent = await signedIn(ctx, 'SH-0044')
    await agent.post('/api/auth/logout').expect(204)
    await agent.get('/api/auth/session').expect(401)
  })

  it('forces a new password on first sign-in and accepts only the new one afterwards', async () => {
    const agent = request.agent(ctx.app)
    const first = await agent.post('/api/auth/login').send({ identifier: '+919845000108', password: TEMPORARY_PASSWORD }).expect(200)
    expect(first.body.user.mustChangePassword).toBe(true)
    const changed = await agent
      .post('/api/auth/password')
      .send({ currentPassword: TEMPORARY_PASSWORD, newPassword: 'govinda-jaya' })
      .expect(200)
    expect(changed.body.user.mustChangePassword).toBe(false)
    await agent.post('/api/auth/logout').expect(204)
    await login('+919845000108', TEMPORARY_PASSWORD).expect(401)
    await login('+919845000108', 'govinda-jaya').expect(200)
  })

  it('rejects a short new password', async () => {
    const agent = await signedIn(ctx, 'SH-0045')
    await agent.post('/api/auth/password').send({ currentPassword: PASSWORD, newPassword: 'short' }).expect(400)
  })

  it('accepts reset requests without revealing whether the account exists', async () => {
    await request(ctx.app).post('/api/auth/reset-request').send({ identifier: 'nobody@example.org' }).expect(202)
    await request(ctx.app).post('/api/auth/reset-request').send({ identifier: '98450 00046' }).expect(202)
    const admin = await signedIn(ctx, 'SH-0001')
    const { body } = await admin.get('/api/devotees/reset-requests').expect(200)
    expect(body.requests.map((item: { devoteeId: string }) => item.devoteeId)).toContain('SH-0046')
  })
})

describe('mobile numbers', () => {
  it('are changed on the profile without a texted code: there is no verification endpoint', async () => {
    const agent = await signedIn(ctx, 'SH-0051')
    await agent.post('/api/auth/otp').send({ phone: '98450 00210' }).expect(404)
  })
})
