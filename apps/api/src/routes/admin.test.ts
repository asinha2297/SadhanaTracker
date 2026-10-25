import request, { type Agent } from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { signedIn, testContext, type TestContext } from '../test/app'

let ctx: TestContext
let admin: Agent

beforeAll(async () => {
  ctx = await testContext()
  admin = await signedIn(ctx, 'SH-0001')
})
afterAll(() => ctx.close())

const login = (identifier: string, password: string) =>
  request(ctx.app).post('/api/auth/login').send({ identifier, password })

describe('administration', () => {
  it('is only for administrators', async () => {
    const coordinator = await signedIn(ctx, 'SH-0007')
    await coordinator.get('/api/admin/audit').expect(403)
    await request(ctx.app).get('/api/admin/audit').expect(401)
  })

  it('lists reset requests and issues a one-time password that must be changed', async () => {
    const pending = await admin.get('/api/admin/reset-requests').expect(200)
    expect(pending.body.requests).toEqual([
      { devoteeId: 'SH-0045', name: 'Vṛndā Devī Dāsī', requestedAt: '2026-10-23T14:20:00.000Z' },
    ])
    const issued = await admin.post('/api/admin/devotees/SH-0045/reset-password').expect(200)
    expect(issued.body.temporaryPassword).toMatch(/^hari-[a-z0-9]{4}-[a-z0-9]{4}$/)
    expect((await admin.get('/api/admin/reset-requests').expect(200)).body.requests).toEqual([])
    const session = await login('+919845000045', issued.body.temporaryPassword).expect(200)
    expect(session.body.user.mustChangePassword).toBe(true)
    await admin.post('/api/admin/devotees/SH-9999/reset-password').expect(404)
  })

  it('creates an account with a mobile number and a temporary password, and records it in the audit log', async () => {
    await admin.post('/api/admin/devotees').send({ name: 'Haridāsa Dāsa', role: 'DEVOTEE', groupId: 'sharanagati' }).expect(400)
    await admin
      .post('/api/admin/devotees')
      .send({ name: 'Haridāsa Dāsa', role: 'DEVOTEE', groupId: 'sharanagati', phone: '98765 43210' })
      .expect(409)
    const created = await admin
      .post('/api/admin/devotees')
      .send({ name: 'Haridāsa Dāsa', role: 'DEVOTEE', groupId: 'sharanagati', phone: '98450 00400', email: 'Haridasa@Example.org' })
      .expect(201)
    expect(created.body.devotee).toMatchObject({
      name: 'Haridāsa Dāsa',
      role: 'DEVOTEE',
      active: true,
      pending: false,
      phone: '+919845000400',
    })
    expect(created.body.devotee.devoteeId).toMatch(/^SH-\d{6}$/)
    const session = await login('haridasa@example.org', created.body.temporaryPassword).expect(200)
    expect(session.body.user.mustChangePassword).toBe(true)
    const audit = await admin.get('/api/admin/audit').expect(200)
    expect(audit.body.events[0]).toMatchObject({
      action: 'ACCOUNT_CREATED',
      actor: 'Nitāi Dāsa (SH-0001)',
      subject: `Haridāsa Dāsa (${created.body.devotee.devoteeId})`,
      details: 'DEVOTEE, Sharanagati',
    })
    await admin.post('/api/admin/devotees').send({ name: '', role: 'DEVOTEE', groupId: null, phone: '98450 00401' }).expect(400)
  })

  it('patches active state, role and group', async () => {
    const deactivated = await admin.patch('/api/admin/devotees/SH-0043').send({ active: false }).expect(200)
    expect(deactivated.body.devotee.active).toBe(false)
    await login('+919845000043', 'haribol').expect(403, { reason: 'INACTIVE' })
    const promoted = await admin.patch('/api/admin/devotees/SH-0043').send({ active: true, role: 'COORDINATOR', groupId: 'east' }).expect(200)
    expect(promoted.body.devotee).toMatchObject({ active: true, role: 'COORDINATOR' })
    await admin.patch('/api/admin/devotees/SH-9999').send({ active: false }).expect(404)
    await admin.patch('/api/admin/devotees/SH-0043').send({ role: 'EMPEROR' }).expect(400)
  })

  it('sets a recommended target without touching earlier ones', async () => {
    const { body } = await admin
      .post('/api/admin/targets')
      .send({ effectiveDate: '2027-01-01', target: { rounds: 16, readingMinutes: 45, hearingMinutes: 45 } })
      .expect(201)
    expect(body.recommended).toEqual([
      { effectiveDate: '2026-01-01', target: { rounds: 16, readingMinutes: 30, hearingMinutes: 30 } },
      { effectiveDate: '2027-01-01', target: { rounds: 16, readingMinutes: 45, hearingMinutes: 45 } },
    ])
    await admin.post('/api/admin/targets').send({ effectiveDate: '2027-01-01', target: { rounds: -1 } }).expect(400)
  })

  it('shows the audit log newest first', async () => {
    const { body } = await admin.get('/api/admin/audit').expect(200)
    expect(body.events[0]).toMatchObject({ action: 'RECOMMENDED_TARGET_SET', id: expect.any(String), at: expect.any(String) })
    expect(body.events.at(-1)).toMatchObject({ action: 'RECOMMENDED_TARGET_SET', at: '2026-01-01T03:30:00.000Z' })
  })
})
