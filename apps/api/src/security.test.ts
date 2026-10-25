import { addDays } from '@sadhana/domain'
import { identifierOf, PASSWORD, TEMPORARY_PASSWORD } from '@sadhana/fixtures'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import pino from 'pino'
import request, { type Agent } from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from './app'
import { todayIn } from './lib/dates'
import { createLogger } from './logger'
import { signedIn, testContext, verifiedCode, type TestContext } from './test/app'

let ctx: TestContext
beforeAll(async () => {
  ctx = await testContext()
})
afterAll(() => ctx.close())

const today = todayIn('Asia/Kolkata')
const noSms = { send: async () => undefined }

const login = (app: TestContext['app'], identifier: string, password: string) =>
  request(app).post('/api/auth/login').send({ identifier, password })

async function agentFor(devoteeId: string, password: string): Promise<Agent> {
  const agent = request.agent(ctx.app)
  await agent.post('/api/auth/login').send({ identifier: identifierOf(devoteeId), password }).expect(200)
  return agent
}

describe('logging', () => {
  it('never writes session cookies to the logs', async () => {
    const lines: string[] = []
    const logger = pino({ level: 'info' }, { write: (line: string) => void lines.push(line) })
    const app = createApp({ db: ctx.db, config: { ...ctx.config, nodeEnv: 'development' }, logger, sms: noSms })
    const agent = request.agent(app)
    const login = await agent.post('/api/auth/login').send({ identifier: identifierOf('SH-0053'), password: PASSWORD }).expect(200)
    await agent.get('/api/me/profile').expect(200)
    const token = /sadhana_session=([^;]+)/.exec(String(login.headers['set-cookie']))?.[1]
    expect(token).toBeTruthy()
    const log = lines.join('')
    expect(log).toContain('"statusCode":200')
    expect(log).not.toContain(token)
    expect(log).not.toContain(PASSWORD)
  })
})

describe('headers', () => {
  it('never lets authenticated responses be cached', async () => {
    const agent = await signedIn(ctx, 'SH-0053')
    const res = await agent.get('/api/me/profile').expect(200)
    expect(res.headers['cache-control']).toBe('no-store')
  })

  it('serves a content security policy without inline styles', async () => {
    const policy = String((await request(ctx.app).get('/api/health')).headers['content-security-policy'])
    expect(policy).toMatch(/style-src 'self'(;|$)/)
    expect(policy).not.toContain('unsafe-inline')
  })
})

describe('cross-site requests', () => {
  const body = { identifier: identifierOf('SH-0053'), password: PASSWORD }

  it('are refused for state changes, by Fetch Metadata or by Origin', async () => {
    await request(ctx.app)
      .post('/api/auth/login')
      .set('Sec-Fetch-Site', 'cross-site')
      .set('Origin', 'https://evil.example')
      .send(body)
      .expect(403, { reason: 'CROSS_SITE' })
    await request(ctx.app).post('/api/auth/login').set('Origin', 'https://evil.example').send(body).expect(403, { reason: 'CROSS_SITE' })
    await request(ctx.app).post('/api/auth/login').set('Origin', 'null').send(body).expect(403, { reason: 'CROSS_SITE' })
  })

  it('are accepted from the app itself, from non-browser clients and for reads', async () => {
    await request(ctx.app).post('/api/auth/login').set('Sec-Fetch-Site', 'same-origin').send(body).expect(200)
    const server = ctx.app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    try {
      const { port } = server.address() as AddressInfo
      await request(server).post('/api/auth/login').set('Origin', `http://127.0.0.1:${port}`).send(body).expect(200)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
    await request(ctx.app).post('/api/auth/login').send(body).expect(200)
    await request(ctx.app).get('/api/health').set('Sec-Fetch-Site', 'cross-site').set('Origin', 'https://evil.example').expect(200)
  })

  it('compare Origin with the host a trusted proxy forwards, never with one an untrusted client claims', async () => {
    const behindProxy = createApp({ db: ctx.db, config: { ...ctx.config, trustProxy: 1 }, logger: createLogger('silent'), sms: noSms })
    await request(behindProxy)
      .post('/api/auth/login')
      .set('Origin', 'https://sadhana.example')
      .set('X-Forwarded-Host', 'sadhana.example')
      .send(body)
      .expect(200)
    await request(ctx.app)
      .post('/api/auth/login')
      .set('Origin', 'https://sadhana.example')
      .set('X-Forwarded-Host', 'sadhana.example')
      .send(body)
      .expect(403, { reason: 'CROSS_SITE' })
  })
})

describe('one-time passwords', () => {
  it('open nothing but the password screen until they are replaced', async () => {
    const agent = await agentFor('SH-0108', TEMPORARY_PASSWORD)
    await agent.get('/api/me/profile').expect(403, { reason: 'PASSWORD_CHANGE_REQUIRED' })
    await agent.get('/api/auth/session').expect(200)
    await agent.post('/api/auth/password').send({ newPassword: 'govinda-jaya' }).expect(400)
    const wrong = await agent.post('/api/auth/password').send({ currentPassword: 'guess', newPassword: 'govinda-jaya' }).expect(400)
    expect(wrong.body.issues).toEqual([{ path: ['currentPassword'], message: "That isn't your current password." }])
    await agent.post('/api/auth/password').send({ currentPassword: TEMPORARY_PASSWORD, newPassword: 'govinda-jaya' }).expect(200)
    await agent.get('/api/me/profile').expect(200)
  })
})

describe('sessions', () => {
  it('end on the server when a devotee signs out, so a copied cookie is useless afterwards', async () => {
    const res = await login(ctx.app, identifierOf('SH-0051'), PASSWORD).expect(200)
    const cookie = String(res.headers['set-cookie']).split(';')[0] ?? ''
    await request(ctx.app).get('/api/auth/session').set('Cookie', cookie).expect(200)
    await request(ctx.app).post('/api/auth/logout').set('Cookie', cookie).expect(204)
    await request(ctx.app).get('/api/auth/session').set('Cookie', cookie).expect(401)
  })

  it('can be ended on every device at once', async () => {
    const here = await agentFor('SH-0052', PASSWORD)
    const elsewhere = await agentFor('SH-0052', PASSWORD)
    await here.post('/api/auth/logout-all').expect(204)
    await elsewhere.get('/api/auth/session').expect(401)
    await here.get('/api/auth/session').expect(401)
  })

  it('end on every other device when the password changes', async () => {
    const here = await agentFor('SH-0044', PASSWORD)
    const elsewhere = await agentFor('SH-0044', PASSWORD)
    await here.post('/api/auth/password').send({ currentPassword: PASSWORD, newPassword: 'nitai-gaura' }).expect(200)
    await elsewhere.get('/api/auth/session').expect(401)
    await here.get('/api/auth/session').expect(200)
  })

  it('end everywhere when an administrator issues a one-time password', async () => {
    const devotee = await signedIn(ctx, 'SH-0046')
    const admin = await signedIn(ctx, 'SH-0001')
    await admin.post('/api/admin/devotees/SH-0046/reset-password').expect(200)
    await devotee.get('/api/auth/session').expect(401)
  })
})

describe('target history', () => {
  it('cannot be rewritten into the past', async () => {
    const devotee = await signedIn(ctx, 'SH-0042')
    const target = { rounds: 1, readingMinutes: 1, hearingMinutes: 1 }
    const past = await devotee.post('/api/me/targets').send({ kind: 'PERSONAL', effectiveDate: addDays(today, -1), target }).expect(400)
    expect(past.body.issues[0].path).toEqual(['effectiveDate'])
    const admin = await signedIn(ctx, 'SH-0001')
    await admin.post('/api/admin/targets').send({ effectiveDate: '2026-01-02', target }).expect(400)
  })
})

describe('idempotency keys', () => {
  it('refuses keys longer than a client would ever send', async () => {
    const devotee = await signedIn(ctx, 'SH-0054')
    const body = { localDate: today, rounds: 16, reading: [], hearing: [], clientUpdatedAt: new Date().toISOString() }
    await devotee.put(`/api/me/entries/${today}`).set('Idempotency-Key', 'k'.repeat(129)).send(body).expect(400)
  })
})

describe('names', () => {
  it('are corrected by administrators, never by devotees themselves', async () => {
    const devotee = await signedIn(ctx, 'SH-0043')
    const { body } = await devotee
      .put('/api/me/profile')
      .send({ name: 'Nitāi Dāsa', phone: '+919845000043', email: '', address: '' })
      .expect(200)
    expect(body.profile.name).toBe('Yaśodā Devī Dāsī')
    const admin = await signedIn(ctx, 'SH-0001')
    const renamed = await admin.patch('/api/admin/devotees/SH-0043').send({ name: ' Yaśodā Devī Dāsī (Bengaluru) ' }).expect(200)
    expect(renamed.body.devotee.name).toBe('Yaśodā Devī Dāsī (Bengaluru)')
    const audit = await admin.get('/api/admin/audit').expect(200)
    expect(audit.body.events[0]).toMatchObject({
      action: 'NAME_CHANGED',
      subject: 'Yaśodā Devī Dāsī (Bengaluru) (SH-0043)',
      details: 'was Yaśodā Devī Dāsī',
    })
    await admin.patch('/api/admin/devotees/SH-0043').send({ name: '  ' }).expect(400)
  })
})

describe('devotee IDs', () => {
  it('are drawn at random, not counted up', async () => {
    const ids: string[] = []
    for (const phone of ['98450 00301', '98450 00302']) {
      const code = await verifiedCode(ctx, phone)
      const res = await request(ctx.app)
        .post('/api/auth/signup')
        .send({ name: 'Nimāi Dāsa', groupId: 'sharanagati', phone, password: 'govinda-jaya', code })
        .expect(201)
      ids.push(res.body.devoteeId)
    }
    expect(ids).toEqual([expect.stringMatching(/^SH-\d{6}$/), expect.stringMatching(/^SH-\d{6}$/)])
    expect(Math.abs(Number(ids[1]?.slice(3)) - Number(ids[0]?.slice(3)))).not.toBe(1)
  })
})

describe('administrators', () => {
  it('cannot remove the last active administrator', async () => {
    const admin = await signedIn(ctx, 'SH-0001')
    await admin.patch('/api/admin/devotees/SH-0001').send({ role: 'COORDINATOR' }).expect(409, { reason: 'LAST_ADMIN' })
    await admin.patch('/api/admin/devotees/SH-0001').send({ active: false }).expect(409, { reason: 'LAST_ADMIN' })
    await admin.patch('/api/admin/devotees/SH-0001').send({ groupId: null }).expect(200)
  })
})

describe('rate limits', () => {
  it('are shared between API instances through the database', async () => {
    const fresh = await testContext()
    try {
      const twin = createApp({ db: fresh.db, config: fresh.config, logger: createLogger('silent'), sms: noSms })
      for (let attempt = 0; attempt < 5; attempt += 1) await login(fresh.app, identifierOf('SH-0043'), 'wrong').expect(401)
      await login(twin, identifierOf('SH-0043'), PASSWORD).expect(429)
    } finally {
      await fresh.close()
    }
  })

  it('cap failed sign-ins per address across every identifier', async () => {
    const fresh = await testContext()
    try {
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await login(fresh.app, `+9198000${String(attempt).padStart(5, '0')}`, 'guess').expect(401)
      }
      await login(fresh.app, identifierOf('SH-0042'), PASSWORD).expect(429)
    } finally {
      await fresh.close()
    }
  })
})
