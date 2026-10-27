import { PASSWORD } from '@sadhana/fixtures'
import request, { type Agent } from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { signedIn, testContext, type TestContext } from '../test/app'

let ctx: TestContext
let coordinator: Agent
let admin: Agent
let devotee: Agent

beforeAll(async () => {
  ctx = await testContext()
  coordinator = await signedIn(ctx, 'SH-0007')
  admin = await signedIn(ctx, 'SH-0001')
  devotee = await signedIn(ctx, 'SH-0042')
})
afterAll(() => ctx.close())

const login = (identifier: string, password: string) =>
  request(ctx.app).post('/api/auth/login').send({ identifier, password })

describe('accounts', () => {
  it('are listed for everyone who manages them, with their record-review grant', async () => {
    const { body } = await coordinator.get('/api/devotees').expect(200)
    const ids = body.devotees.map((account: { devoteeId: string }) => account.devoteeId)
    expect(ids).toEqual(expect.arrayContaining(['SH-0001', 'SH-0007', 'SH-0042', 'SH-0099']))
    expect(body.devotees.find((account: { devoteeId: string }) => account.devoteeId === 'SH-0007')).toMatchObject({
      name: 'Govinda Dāsa',
      role: 'COORDINATOR',
      active: true,
      phone: '+919845000007',
      canReviewRecords: true,
    })
    expect(body.devotees.find((account: { devoteeId: string }) => account.devoteeId === 'SH-0011').canReviewRecords).toBe(false)
    await admin.get('/api/devotees').expect(200)
    await devotee.get('/api/devotees').expect(403)
  })

  it('are created with a one-time password that must be replaced at first sign-in', async () => {
    const created = await coordinator
      .post('/api/devotees')
      .send({ name: 'Haridāsa Dāsa', phone: '98450 00300', email: 'Haridasa@Example.org' })
      .expect(201)
    expect(created.body.devotee).toMatchObject({
      name: 'Haridāsa Dāsa',
      role: 'DEVOTEE',
      active: true,
      phone: '+919845000300',
      email: 'haridasa@example.org',
      canReviewRecords: false,
    })
    expect(created.body.devotee.devoteeId).toMatch(/^SH-\d{6}$/)
    expect(created.body.temporaryPassword).toMatch(/^hari-[a-z0-9]{4}-[a-z0-9]{4}$/)
    const session = await login('haridasa@example.org', created.body.temporaryPassword).expect(200)
    expect(session.body.user.mustChangePassword).toBe(true)
    await coordinator.post('/api/devotees').send({ name: 'Nimāi Dāsa', phone: '98450 00300' }).expect(409)
    await coordinator.post('/api/devotees').send({ name: '', phone: '98450 00301' }).expect(400)
  })

  it('lets only administrators create coordinators and administrators', async () => {
    await coordinator.post('/api/devotees').send({ name: 'Gaura Dāsa', phone: '98450 00302', role: 'COORDINATOR' }).expect(403)
    const created = await admin.post('/api/devotees').send({ name: 'Gaura Dāsa', phone: '98450 00302', role: 'COORDINATOR' }).expect(201)
    expect(created.body.devotee.role).toBe('COORDINATOR')
    const audit = await admin.get('/api/admin/audit').expect(200)
    expect(audit.body.events[0]).toMatchObject({
      action: 'ACCOUNT_CREATED',
      actor: 'Nitāi Dāsa (SH-0001)',
      subject: `Gaura Dāsa (${created.body.devotee.devoteeId})`,
      details: 'COORDINATOR',
    })
  })

  it('lets a coordinator issue one-time passwords for devotees only', async () => {
    const issued = await coordinator.post('/api/devotees/SH-0043/reset-password').expect(200)
    expect(issued.body.temporaryPassword).toMatch(/^hari-/)
    await login('+919845000043', issued.body.temporaryPassword).expect(200)
    await coordinator.post('/api/devotees/SH-0001/reset-password').expect(403)
    await coordinator.post('/api/devotees/SH-0011/reset-password').expect(403)
    await admin.post('/api/devotees/SH-0011/reset-password').expect(200)
    await admin.post('/api/devotees/SH-9999/reset-password').expect(404)
  })

  it('shows reset requests, only devotees’ ones to a coordinator', async () => {
    await request(ctx.app).post('/api/auth/reset-request').send({ identifier: '98450 00011' }).expect(202)
    const theirs = await coordinator.get('/api/devotees/reset-requests').expect(200)
    expect(theirs.body.requests.map((item: { devoteeId: string }) => item.devoteeId)).toEqual(['SH-0045'])
    const all = await admin.get('/api/devotees/reset-requests').expect(200)
    expect(all.body.requests.map((item: { devoteeId: string }) => item.devoteeId)).toEqual(['SH-0045', 'SH-0011'])
  })

  it('lets administrators change role, activity, name and record review, each audited', async () => {
    await coordinator.patch('/api/devotees/SH-0044').send({ active: false }).expect(403)
    const deactivated = await admin.patch('/api/devotees/SH-0044').send({ active: false }).expect(200)
    expect(deactivated.body.devotee.active).toBe(false)
    await login('+919845000044', PASSWORD).expect(403, { reason: 'INACTIVE' })
    await admin.patch('/api/devotees/SH-0044').send({ active: true, role: 'COORDINATOR' }).expect(200)
    const granted = await admin.patch('/api/devotees/SH-0011').send({ canReviewRecords: true }).expect(200)
    expect(granted.body.devotee.canReviewRecords).toBe(true)
    const audit = await admin.get('/api/admin/audit').expect(200)
    expect(audit.body.events[0]).toMatchObject({ action: 'RECORD_REVIEW_GRANTED', subject: 'Lalitā Devī Dāsī (SH-0011)' })
    await admin.patch('/api/devotees/SH-0011').send({ canReviewRecords: false }).expect(200)
    expect((await admin.get('/api/admin/audit').expect(200)).body.events[0].action).toBe('RECORD_REVIEW_REVOKED')
    await admin.patch('/api/devotees/SH-9999').send({ active: false }).expect(404)
    await admin.patch('/api/devotees/SH-0043').send({ role: 'EMPEROR' }).expect(400)
  })
})
