import { CONTACT_IN_USE, VERIFICATION } from '@sadhana/contract'
import { PASSWORD, TEMPORARY_PASSWORD } from '@sadhana/fixtures'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { phoneVerifications } from '../db/schema'
import { signedIn, testContext, verifiedCode, type TestContext } from '../test/app'

let ctx: TestContext
beforeAll(async () => {
  ctx = await testContext()
})
afterAll(() => ctx.close())

const login = (identifier: string, password: string) =>
  request(ctx.app).post('/api/auth/login').send({ identifier, password })

const signup = (body: object) => request(ctx.app).post('/api/auth/signup').send(body)
const otp = (phone: string) => request(ctx.app).post('/api/auth/otp').send({ phone })

const newcomer = (phone: string, code?: string) => ({
  name: 'Haridāsa Dāsa',
  groupId: 'sharanagati',
  phone,
  password: 'govinda-jaya',
  code,
})

const anotherCode = (code: string) => (code === '000000' ? '000001' : '000000')

describe('health', () => {
  it('reports ok', async () => {
    await request(ctx.app).get('/api/health').expect(200, { ok: true })
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

  it('tells a wrong password, an unknown identifier, an inactive account and a pending account apart', async () => {
    await login('radhika@example.org', 'wrong').expect(401)
    await login('nobody@example.org', PASSWORD).expect(401)
    await login('not an identifier', PASSWORD).expect(401)
    await login('+919845000099', PASSWORD).expect(403, { reason: 'INACTIVE' })
    const created = await signup(newcomer('98450 00200', await verifiedCode(ctx, '98450 00200'))).expect(201)
    expect(created.body.devoteeId).toMatch(/^SH-\d{6}$/)
    await login('98450 00200', 'govinda-jaya').expect(403, { reason: 'PENDING' })
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
    const { body } = await admin.get('/api/admin/reset-requests').expect(200)
    expect(body.requests.map((item: { devoteeId: string }) => item.devoteeId)).toContain('SH-0046')
  })

  it('requires a valid, unused mobile number to sign up', async () => {
    const missing = await signup({ name: 'Nimāi Dāsa', groupId: 'sharanagati', password: 'govinda-jaya', code: '123456' }).expect(400)
    expect(missing.body.issues.map((issue: { path: unknown[] }) => issue.path[0])).toContain('phone')
    await signup(newcomer('12', '123456')).expect(400)
    const taken = await signup(newcomer('98765 43210', '123456')).expect(409)
    expect(taken.body.issues).toEqual([{ path: ['phone'], message: CONTACT_IN_USE.phone }])
    const takenEmail = await signup({ ...newcomer('98450 00201', '123456'), email: 'RADHIKA@example.org' }).expect(409)
    expect(takenEmail.body.issues).toEqual([{ path: ['email'], message: CONTACT_IN_USE.email }])
  })

  it('lists groups publicly for sign-up', async () => {
    const response = await request(ctx.app).get('/api/groups/public').expect(200)
    expect(response.body.groups).toEqual(
      expect.arrayContaining([
        { id: 'sharanagati', name: 'Sharanagati' },
        { id: 'east', name: 'Sharanagati East' },
      ]),
    )
  })
})

describe('mobile number verification', () => {
  it('sends a six-digit code by SMS and opens the account only to its holder', async () => {
    await otp('98450 00210').expect(202)
    const sent = ctx.sms.at(-1)
    expect(sent?.to).toBe('+919845000210')
    expect(sent?.message).toMatch(/\b\d{6}\b/)
    const code = /\b(\d{6})\b/.exec(sent?.message ?? '')?.[1] ?? ''
    const missing = await signup(newcomer('98450 00210')).expect(400)
    expect(missing.body.issues.map((issue: { path: unknown[] }) => issue.path[0])).toContain('code')
    const wrong = await signup(newcomer('98450 00210', anotherCode(code))).expect(400)
    expect(wrong.body.issues).toEqual([{ path: ['code'], message: VERIFICATION.wrong }])
    await signup(newcomer('98450 00210', code)).expect(201)
    await signup(newcomer('98450 00210', code)).expect(409)
  })

  it('gives a code five tries and ten minutes, and resends only after a minute', async () => {
    const code = await verifiedCode(ctx, '98450 00211')
    await otp('98450 00211').expect(429)
    for (let attempt = 0; attempt < 5; attempt += 1) await signup(newcomer('98450 00211', anotherCode(code))).expect(400)
    const exhausted = await signup(newcomer('98450 00211', code)).expect(400)
    expect(exhausted.body.issues).toEqual([{ path: ['code'], message: VERIFICATION.exhausted }])

    const stale = await verifiedCode(ctx, '98450 00212')
    await ctx.db
      .update(phoneVerifications)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(phoneVerifications.phone, '+919845000212'))
    const expired = await signup(newcomer('98450 00212', stale)).expect(400)
    expect(expired.body.issues).toEqual([{ path: ['code'], message: VERIFICATION.expired }])
  })

  it('sends nothing to a number that already has an account, or that is not a mobile number', async () => {
    const before = ctx.sms.length
    const taken = await otp('98765 43210').expect(409)
    expect(taken.body.issues).toEqual([{ path: ['phone'], message: CONTACT_IN_USE.phone }])
    await otp('12').expect(400)
    expect(ctx.sms).toHaveLength(before)
  })
})
