import { addDays } from '@sadhana/domain'
import request, { type Agent } from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { todayIn } from '../lib/dates'
import { signedIn, testContext, verifiedCode, type TestContext } from '../test/app'

let ctx: TestContext
let agent: Agent
const today = todayIn('Asia/Kolkata')
const yesterday = addDays(today, -1)

beforeAll(async () => {
  ctx = await testContext()
  agent = await signedIn(ctx, 'SH-0042')
})
afterAll(() => ctx.close())

const entry = (localDate: string, rounds: number, baseUpdatedAt?: string) => ({
  localDate,
  rounds,
  reading: [{ bookId: 2, minutes: 30 }],
  hearing: [],
  clientUpdatedAt: new Date().toISOString(),
  baseUpdatedAt,
})

const put = (localDate: string, body: object, key: string) =>
  agent.put(`/api/me/entries/${localDate}`).set('Idempotency-Key', key).send(body)

const range = (from: string, to: string) => agent.get(`/api/me/entries?from=${from}&to=${to}`)

describe('entries', () => {
  it('lists a devotee’s entries within a date range', async () => {
    const from = addDays(today, -7)
    const { body } = await range(from, today).expect(200)
    expect(body.entries.length).toBeGreaterThan(0)
    for (const record of body.entries) {
      expect(record.localDate >= from && record.localDate <= today).toBe(true)
      expect(record).toMatchObject({ rounds: expect.any(Number), updatedAt: expect.any(String) })
    }
  })

  it('requires both bounds and valid dates', async () => {
    await agent.get('/api/me/entries?from=2026-10-01').expect(400)
    await agent.get('/api/me/entries?from=2026-02-30&to=2026-03-01').expect(400)
  })

  it('saves today and replays the same Idempotency-Key instead of saving twice', async () => {
    const first = await put(today, entry(today, 16), 'key-1').expect(200)
    expect(first.body.entry).toMatchObject({
      localDate: today,
      rounds: 16,
      reading: [{ bookId: 2, bookTitle: 'Śrīmad-Bhāgavatam', minutes: 30 }],
    })
    const replay = await put(today, entry(today, 8), 'key-1').expect(200)
    expect(replay.body.entry).toEqual(first.body.entry)
    const { body } = await range(today, today).expect(200)
    expect(body.entries).toEqual([first.body.entry])
  })

  it('reports a version conflict with the current record and accepts the save once rebased', async () => {
    const existing = (await range(yesterday, yesterday).expect(200)).body.entries[0]
    const saved = await put(yesterday, entry(yesterday, 10, existing?.updatedAt), 'key-2').expect(200)
    const conflict = await put(yesterday, entry(yesterday, 12, existing?.updatedAt), 'key-3').expect(409)
    expect(conflict.body.entry).toEqual(saved.body.entry)
    const rebased = await put(yesterday, entry(yesterday, 12, saved.body.entry.updatedAt), 'key-4').expect(200)
    expect(rebased.body.entry.rounds).toBe(12)
  })

  it('refuses days outside the edit window and malformed requests', async () => {
    await put(addDays(today, -10), entry(addDays(today, -10), 4), 'key-5').expect(422)
    await put(addDays(today, 1), entry(addDays(today, 1), 4), 'key-6').expect(422)
    await put('2026-13-40', entry('2026-13-40', 4), 'key-7').expect(400)
    await put(today, entry(yesterday, 4), 'key-8').expect(400)
    await put(today, { ...entry(today, -1), rounds: -1 }, 'key-9').expect(400)
  })

  it('names the lecture and speaker behind a hearing session and refuses ids the library does not hold', async () => {
    const current = (await range(today, today).expect(200)).body.entries[0]
    const saved = await put(
      today,
      { ...entry(today, 8, current?.updatedAt), reading: [], hearing: [{ lectureId: 4, minutes: 25 }] },
      'key-10',
    ).expect(200)
    expect(saved.body.entry.hearing).toEqual([{ lectureId: 4, lectureTitle: 'Japa workshop', speaker: 'Govinda Dāsa', source: 'Temple', minutes: 25 }])
    const unknown = await put(today, { ...entry(today, 8, saved.body.entry.updatedAt), reading: [{ bookId: 999, minutes: 5 }] }, 'key-11').expect(400)
    expect(unknown.body.issues).toEqual([{ path: ['reading', 0, 'bookId'], message: 'Choose a book from the library' }])
    await put(today, { ...entry(today, 8, saved.body.entry.updatedAt), reading: [{ bookTitle: 'Typed by hand', minutes: 5 }] }, 'key-12').expect(400)
  })

  it('never shows one devotee another devotee’s record', async () => {
    const other = await signedIn(ctx, 'SH-0043')
    const { body } = await other.get(`/api/me/entries?from=${today}&to=${today}`).expect(200)
    expect(body.entries).toEqual([])
  })

  it('is 401 when signed out', async () => {
    await request(ctx.app).get(`/api/me/entries?from=${today}&to=${today}`).expect(401)
  })
})

describe('targets', () => {
  it('returns the recommended history and the devotee’s own choices', async () => {
    const { body } = await agent.get('/api/me/targets').expect(200)
    expect(body.recommended).toEqual([
      { effectiveDate: '2026-01-01', target: { rounds: 16, readingMinutes: 30, hearingMinutes: 30 } },
    ])
    expect(body.personal).toEqual([])
    const nanda = await signedIn(ctx, 'SH-0044')
    const theirs = await nanda.get('/api/me/targets').expect(200)
    expect(theirs.body.personal).toEqual([
      { effectiveDate: '2026-06-01', kind: 'PERSONAL', target: { rounds: 8, readingMinutes: 15, hearingMinutes: 15 } },
    ])
  })

  it('records a new choice and rejects an incomplete one', async () => {
    const { body } = await agent
      .post('/api/me/targets')
      .send({ kind: 'PERSONAL', effectiveDate: today, target: { rounds: 8, readingMinutes: 15, hearingMinutes: 15 } })
      .expect(201)
    expect(body.personal).toEqual([
      { effectiveDate: today, kind: 'PERSONAL', target: { rounds: 8, readingMinutes: 15, hearingMinutes: 15 } },
    ])
    await agent.post('/api/me/targets').send({ kind: 'PERSONAL', effectiveDate: today }).expect(400)
  })
})

describe('profile', () => {
  it('reads the profile and updates contact details, dropping blank optional fields', async () => {
    const { body } = await agent.get('/api/me/profile').expect(200)
    expect(body.profile).toEqual({
      devoteeId: 'SH-0042',
      name: 'Rādhikā Devī Dāsī',
      phone: '+919876543210',
      email: 'radhika@example.org',
      address: 'Sharanagati, Bengaluru',
    })
    const updated = await agent.put('/api/me/profile').send({ phone: '98765 43210', email: '', address: '' }).expect(200)
    expect(updated.body.profile.email).toBeUndefined()
    expect(updated.body.profile.name).toBe('Rādhikā Devī Dāsī')
  })

  it('changes the mobile number only with a code sent to the new one', async () => {
    const unverified = await agent.put('/api/me/profile').send({ phone: '90000 00000', email: '' }).expect(400)
    expect(unverified.body.issues).toEqual([{ path: ['code'], message: 'Verify your new mobile number with the code we sent' }])
    const code = await verifiedCode(ctx, agent, '90000 00000')
    const updated = await agent.put('/api/me/profile').send({ phone: '90000 00000', email: '', code }).expect(200)
    expect(updated.body.profile.phone).toBe('+919000000000')
    await request(ctx.app).post('/api/auth/login').send({ identifier: '90000 00000', password: 'haribol' }).expect(200)
  })

  it('rejects an invalid email, a missing mobile number and a number another devotee uses', async () => {
    await agent.put('/api/me/profile').send({ email: 'not-an-email', phone: '+919000000000' }).expect(400)
    await agent.put('/api/me/profile').send({ email: '', phone: '' }).expect(400)
    const taken = await agent.put('/api/me/profile').send({ email: '', phone: '+919845000043' }).expect(409)
    expect(taken.body.issues[0].path).toEqual(['phone'])
  })
})

describe('reminders', () => {
  it('reads defaults for a devotee without settings and saves changes', async () => {
    const yasoda = await signedIn(ctx, 'SH-0043')
    const { body } = await yasoda.get('/api/me/reminders').expect(200)
    expect(body.reminders).toEqual({ enabled: false, time: '21:00', timeZone: 'Asia/Kolkata', channel: 'IN_APP' })
    const saved = await yasoda
      .put('/api/me/reminders')
      .send({ enabled: true, time: '20:30', timeZone: 'Asia/Kolkata', channel: 'IN_APP' })
      .expect(200)
    expect(saved.body.reminders.time).toBe('20:30')
    expect((await yasoda.get('/api/me/reminders').expect(200)).body.reminders).toEqual(saved.body.reminders)
  })

  it('rejects a malformed time', async () => {
    await agent.put('/api/me/reminders').send({ enabled: true, time: '9pm', timeZone: 'Asia/Kolkata', channel: 'IN_APP' }).expect(400)
  })
})
