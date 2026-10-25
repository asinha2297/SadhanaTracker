import { addDays, weekRangeOf } from '@sadhana/domain'
import request, { type Agent, type Response } from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { todayIn } from '../lib/dates'
import { signedIn, testContext, verifiedCode, type TestContext } from '../test/app'

let ctx: TestContext
let coordinator: Agent
let admin: Agent
let devotee: Agent
const today = todayIn('Asia/Kolkata')
const week = weekRangeOf(today).start

beforeAll(async () => {
  ctx = await testContext()
  coordinator = await signedIn(ctx, 'SH-0007')
  admin = await signedIn(ctx, 'SH-0001')
  devotee = await signedIn(ctx, 'SH-0042')
})
afterAll(() => ctx.close())

const binary = (res: Response, callback: (error: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = []
  res.on('data', (chunk: Buffer) => chunks.push(chunk))
  res.on('end', () => callback(null, Buffer.concat(chunks)))
}

describe('group visibility', () => {
  it('shows a coordinator their groups, an admin every group and a devotee nothing', async () => {
    const mine = await coordinator.get('/api/groups').expect(200)
    expect(mine.body.groups).toEqual([{ id: 'sharanagati', name: 'Sharanagati', memberCount: 7, canReviewRecords: true }])
    const all = await admin.get('/api/groups').expect(200)
    expect(all.body.groups.map((group: { id: string }) => group.id).sort()).toEqual(['east', 'sharanagati'])
    await devotee.get('/api/groups').expect(403)
  })
})

describe('reports', () => {
  it('reports the week, with member rows only where record review is granted', async () => {
    const { body } = await coordinator.get(`/api/groups/sharanagati/report?week=${week}`).expect(200)
    expect(body.report.group).toEqual({ id: 'sharanagati', name: 'Sharanagati' })
    expect(body.report.week).toEqual({ start: week, end: addDays(week, 6) })
    expect(body.report.summary.members).toBe(7)
    expect(body.report.members).toHaveLength(7)
    expect(body.report.members[0].days).toHaveLength(7)
    expect(body.report.members[0].completion).toEqual({
      rounds: expect.any(Number),
      readingMinutes: expect.any(Number),
      hearingMinutes: expect.any(Number),
    })
    const east = await admin.get(`/api/groups/east/report?week=${week}`).expect(200)
    expect(east.body.report.summary.members).toBe(5)
    expect(east.body.report.members).toBeUndefined()
  })

  it('defaults to the current week and refuses groups outside the coordinator’s care', async () => {
    const { body } = await coordinator.get('/api/groups/sharanagati/report').expect(200)
    expect(body.report.week.start).toBe(week)
    await coordinator.get(`/api/groups/east/report?week=${week}`).expect(403)
    await admin.get('/api/groups/nowhere/report').expect(404)
  })
})

describe('roster', () => {
  it('lists members and flags pending sign-ups', async () => {
    const before = await coordinator.get('/api/groups/sharanagati/members').expect(200)
    expect(before.body.members).toEqual(
      expect.arrayContaining([expect.objectContaining({ devoteeId: 'SH-0042', active: true, pending: false })]),
    )
    const signup = await request(ctx.app)
      .post('/api/auth/signup')
      .send({ name: 'Haridāsa Dāsa', groupId: 'sharanagati', phone: '98450 00300', password: 'govinda-jaya', code: await verifiedCode(ctx, '98450 00300') })
      .expect(201)
    const after = await coordinator.get('/api/groups/sharanagati/members').expect(200)
    expect(after.body.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ devoteeId: signup.body.devoteeId, pending: true, active: false, phone: '+919845000300' }),
      ]),
    )
    await coordinator.post(`/api/groups/sharanagati/members/${signup.body.devoteeId}/approve`).expect(204)
    await request(ctx.app).post('/api/auth/login').send({ identifier: '98450 00300', password: 'govinda-jaya' }).expect(200)
  })

  it('lets a coordinator create a group, move devotees in and out, and decline a request', async () => {
    const created = await coordinator.post('/api/groups').send({ name: 'Sharanagati Youth' }).expect(201)
    expect(created.body.group).toEqual({ id: 'sharanagati-youth', name: 'Sharanagati Youth', memberCount: 0, canReviewRecords: false })
    await coordinator.put('/api/groups/sharanagati-youth/members/SH-0046').expect(204)
    const members = await coordinator.get('/api/groups/sharanagati-youth/members').expect(200)
    expect(members.body.members.map((member: { devoteeId: string }) => member.devoteeId)).toEqual(['SH-0046'])
    await coordinator.delete('/api/groups/sharanagati-youth/members/SH-0046').expect(204)
    expect((await coordinator.get('/api/groups/sharanagati-youth/members').expect(200)).body.members).toEqual([])
    await coordinator.put('/api/groups/sharanagati-youth/members/SH-0046').expect(204)
    const signup = await request(ctx.app)
      .post('/api/auth/signup')
      .send({ name: 'Nimāi Dāsa', groupId: 'sharanagati-youth', phone: '98450 00301', password: 'govinda-jaya', code: await verifiedCode(ctx, '98450 00301') })
      .expect(201)
    await coordinator.delete(`/api/groups/sharanagati-youth/members/${signup.body.devoteeId}`).expect(204)
    await request(ctx.app).post('/api/auth/login').send({ identifier: '98450 00301', password: 'govinda-jaya' }).expect(401)
  })

  it('keeps coordinators out of groups they do not coordinate', async () => {
    await coordinator.get('/api/groups/east/members').expect(403)
    await coordinator.put('/api/groups/east/members/SH-0042').expect(403)
    await devotee.get('/api/groups/sharanagati/members').expect(403)
  })

  it('lets a coordinator take in only devotees without a group or already in their care', async () => {
    await coordinator.put('/api/groups/sharanagati/members/SH-0051').expect(403)
    await coordinator.put('/api/groups/sharanagati/members/SH-0011').expect(403)
    await coordinator.put('/api/groups/sharanagati/members/SH-0001').expect(403)
    await admin.put('/api/groups/sharanagati/members/SH-0051').expect(204)
    await admin.put('/api/groups/east/members/SH-0051').expect(204)
  })

  it('offers each roster manager only the devotees they may add', async () => {
    const mine = (await coordinator.get('/api/devotees').expect(200)).body.devotees.map((d: { devoteeId: string }) => d.devoteeId)
    expect(mine).toContain('SH-0042')
    expect(mine).not.toContain('SH-0052')
    expect(mine).not.toContain('SH-0007')
    const all = await admin.get('/api/devotees').expect(200)
    expect(all.body.devotees).toEqual(expect.arrayContaining([{ devoteeId: 'SH-0052', name: 'Tulasī Devī Dāsī', groupId: 'east' }]))
    expect(all.body.devotees.some((candidate: { devoteeId: string }) => candidate.devoteeId === 'SH-0099')).toBe(false)
    await devotee.get('/api/devotees').expect(403)
  })
})

describe('export', () => {
  const from = addDays(today, -6)

  it('streams individual rows as CSV for a review-enabled group, never reflections', async () => {
    const res = await coordinator.get(`/api/groups/sharanagati/export?from=${from}&to=${today}&format=csv`).expect(200)
    expect(res.headers['content-type']).toMatch(/text\/csv/)
    expect(res.headers['content-disposition']).toBe(`attachment; filename="sadhana-sharanagati-${from}-${today}.csv"`)
    const lines = res.text.trim().split('\n')
    expect(lines[0]).toBe('devoteeId,name,date,status,rounds,readingMinutes,hearingMinutes')
    const { memberCount } = (await coordinator.get('/api/groups').expect(200)).body.groups[0]
    expect(lines).toHaveLength(1 + memberCount * 7)
    expect(res.text).not.toMatch(/reflection/i)
  })

  it('exports daily totals only for a group without record review', async () => {
    const res = await admin.get(`/api/groups/east/export?from=${from}&to=${today}&format=csv`).expect(200)
    expect(res.text.split('\n')[0]).toBe('date,members,recorded,rounds,readingMinutes,hearingMinutes')
  })

  it('produces an Excel workbook', async () => {
    const res = await coordinator
      .get(`/api/groups/sharanagati/export?from=${from}&to=${today}&format=xlsx`)
      .buffer(true)
      .parse(binary)
      .expect(200)
    expect(res.headers['content-type']).toMatch(/spreadsheetml/)
    expect((res.body as Buffer).subarray(0, 2).toString()).toBe('PK')
  })

  it('refuses exports the caller may not see', async () => {
    await coordinator.get(`/api/groups/east/export?from=${from}&to=${today}&format=csv`).expect(403)
    await devotee.get(`/api/groups/sharanagati/export?from=${from}&to=${today}&format=csv`).expect(403)
    await coordinator.get('/api/groups/sharanagati/export?from=nope&to=nope&format=csv').expect(400)
  })
})
