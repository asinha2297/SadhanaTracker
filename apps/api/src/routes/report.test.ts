import { addDays, weekRangeOf } from '@sadhana/domain'
import request, { type Agent, type Response } from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { todayIn } from '../lib/dates'
import { signedIn, testContext, type TestContext } from '../test/app'

let ctx: TestContext
let reviewer: Agent
let coordinator: Agent
let admin: Agent
let devotee: Agent
const today = todayIn('Asia/Kolkata')
const week = weekRangeOf(today).start
const ACTIVE_ACCOUNTS = 13

beforeAll(async () => {
  ctx = await testContext()
  reviewer = await signedIn(ctx, 'SH-0007')
  coordinator = await signedIn(ctx, 'SH-0011')
  admin = await signedIn(ctx, 'SH-0001')
  devotee = await signedIn(ctx, 'SH-0042')
})
afterAll(() => ctx.close())

const binary = (res: Response, callback: (error: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = []
  res.on('data', (chunk: Buffer) => chunks.push(chunk))
  res.on('end', () => callback(null, Buffer.concat(chunks)))
}

describe('the congregation report', () => {
  it('covers every active devotee, with rows only for reviewers and administrators', async () => {
    const { body } = await reviewer.get(`/api/report?week=${week}`).expect(200)
    expect(body.report.week).toEqual({ start: week, end: addDays(week, 6) })
    expect(body.report.summary.members).toBe(ACTIVE_ACCOUNTS)
    expect(body.report.members).toHaveLength(ACTIVE_ACCOUNTS)
    expect(body.report.members[0].days).toHaveLength(7)
    expect(body.report.members[0].completion).toEqual({
      rounds: expect.any(Number),
      readingMinutes: expect.any(Number),
      hearingMinutes: expect.any(Number),
    })
    const plain = await coordinator.get(`/api/report?week=${week}`).expect(200)
    expect(plain.body.report.summary.members).toBe(ACTIVE_ACCOUNTS)
    expect(plain.body.report.members).toBeUndefined()
    expect((await admin.get(`/api/report?week=${week}`).expect(200)).body.report.members).toHaveLength(ACTIVE_ACCOUNTS)
    await devotee.get(`/api/report?week=${week}`).expect(403)
  })

  it('defaults to the current week and refuses a malformed one', async () => {
    const { body } = await coordinator.get('/api/report').expect(200)
    expect(body.report.week.start).toBe(week)
    await coordinator.get('/api/report?week=nope').expect(400)
  })
})

describe('export', () => {
  const from = addDays(today, -6)

  it('streams individual rows as CSV for a reviewer, never reflections', async () => {
    const res = await reviewer.get(`/api/export?from=${from}&to=${today}&format=csv`).expect(200)
    expect(res.headers['content-type']).toMatch(/text\/csv/)
    expect(res.headers['content-disposition']).toBe(`attachment; filename="sadhana-${from}-${today}.csv"`)
    const lines = res.text.trim().split('\n')
    expect(lines[0]).toBe('devoteeId,name,date,status,rounds,readingMinutes,hearingMinutes')
    expect(lines).toHaveLength(1 + ACTIVE_ACCOUNTS * 7)
    expect(res.text).not.toMatch(/reflection/i)
  })

  it('exports daily totals only for a coordinator without record review', async () => {
    const res = await coordinator.get(`/api/export?from=${from}&to=${today}&format=csv`).expect(200)
    expect(res.text.split('\n')[0]).toBe('date,members,recorded,rounds,readingMinutes,hearingMinutes')
  })

  it('produces an Excel workbook', async () => {
    const res = await admin.get(`/api/export?from=${from}&to=${today}&format=xlsx`).buffer(true).parse(binary).expect(200)
    expect(res.headers['content-type']).toMatch(/spreadsheetml/)
    expect((res.body as Buffer).subarray(0, 2).toString()).toBe('PK')
  })

  it('refuses exports to devotees and malformed ranges', async () => {
    await devotee.get(`/api/export?from=${from}&to=${today}&format=csv`).expect(403)
    await coordinator.get('/api/export?from=nope&to=nope&format=csv').expect(400)
    await coordinator.get(`/api/export?from=${today}&to=${from}&format=csv`).expect(400)
    await request(ctx.app).get(`/api/export?from=${from}&to=${today}&format=csv`).expect(401)
  })
})
