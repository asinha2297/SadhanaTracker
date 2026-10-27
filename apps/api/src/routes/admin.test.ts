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

const target = { effectiveDate: '2027-01-01', target: { rounds: 16, readingMinutes: 45, hearingMinutes: 45 } }

describe('administration', () => {
  it('is only for administrators', async () => {
    const coordinator = await signedIn(ctx, 'SH-0007')
    await coordinator.get('/api/admin/audit').expect(403)
    await coordinator.post('/api/admin/targets').send(target).expect(403)
    await request(ctx.app).get('/api/admin/audit').expect(401)
  })

  it('sets a recommended target without touching earlier ones', async () => {
    const { body } = await admin.post('/api/admin/targets').send(target).expect(201)
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
