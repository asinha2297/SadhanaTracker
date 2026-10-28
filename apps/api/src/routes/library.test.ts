import { LIBRARY_DUPLICATE } from '@sadhana/contract'
import request, { type Agent } from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { todayIn } from '../lib/dates'
import { signedIn, testContext, type TestContext } from '../test/app'

let ctx: TestContext
let devotee: Agent
let coordinator: Agent

beforeAll(async () => {
  ctx = await testContext()
  devotee = await signedIn(ctx, 'SH-0042')
  coordinator = await signedIn(ctx, 'SH-0007')
})
afterAll(() => ctx.close())

describe('library', () => {
  it('lists books and lectures alphabetically with how often they are used, for any signed-in devotee', async () => {
    const { body } = await devotee.get('/api/library').expect(200)
    const titles = body.library.books.map((book: { title: string }) => book.title)
    expect(titles).toContain('Bhagavad-gītā As It Is')
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)))
    expect(body.library.books.some((book: { uses: number }) => book.uses > 0)).toBe(true)
    expect(body.library.lectures[0]).toMatchObject({ id: expect.any(Number), title: expect.any(String), speaker: expect.any(String) })
  })

  it('lets a coordinator add, rename and remove a book, refusing a duplicate title in any case', async () => {
    const created = await coordinator.post('/api/library/books').send({ title: ' Light of the Bhāgavata ' }).expect(201)
    expect(created.body.book).toEqual({ id: expect.any(Number), title: 'Light of the Bhāgavata', uses: 0 })
    const clash = await coordinator.post('/api/library/books').send({ title: 'light of the bhāgavata' }).expect(409)
    expect(clash.body.issues).toEqual([{ path: ['title'], message: LIBRARY_DUPLICATE.book }])
    await coordinator.post('/api/library/books').send({ title: '   ' }).expect(400)
    const renamed = await coordinator.put(`/api/library/books/${created.body.book.id}`).send({ title: 'Light of the Bhāgavata (2nd ed.)' }).expect(200)
    expect(renamed.body.book.title).toBe('Light of the Bhāgavata (2nd ed.)')
    await coordinator.delete(`/api/library/books/${created.body.book.id}`).expect(204)
    const { body } = await coordinator.get('/api/library').expect(200)
    expect(body.library.books.map((book: { title: string }) => book.title)).not.toContain('Light of the Bhāgavata (2nd ed.)')
    await coordinator.delete(`/api/library/books/${created.body.book.id}`).expect(404)
    await coordinator.delete('/api/library/books/not-an-id').expect(404)
  })

  it('keeps a book that records point at, saying how many', async () => {
    const today = todayIn('Asia/Kolkata')
    await devotee
      .put(`/api/me/entries/${today}`)
      .send({ localDate: today, rounds: 16, reading: [{ bookId: 6, minutes: 20 }], hearing: [], clientUpdatedAt: new Date().toISOString() })
      .expect(200)
    const refused = await coordinator.delete('/api/library/books/6').expect(409)
    expect(refused.body.reason).toBe('IN_USE')
    expect(refused.body.uses).toBeGreaterThanOrEqual(1)
    const renamed = await coordinator.put('/api/library/books/6').send({ title: 'Śrī Īśopaniṣad (with purports)' }).expect(200)
    expect(renamed.body.book.uses).toBe(refused.body.uses)
    const { body } = await devotee.get(`/api/me/entries?from=${today}&to=${today}`).expect(200)
    expect(body.entries[0].reading[0]).toMatchObject({ bookId: 6, bookTitle: 'Śrī Īśopaniṣad (with purports)', minutes: 20 })
  })

  it('adds a lecture with its speaker and source, edits it, and refuses the same title by the same speaker', async () => {
    const created = await coordinator
      .post('/api/library/lectures')
      .send({ title: 'Nectar of Devotion seminar', speaker: 'Govinda Dāsa', source: '' })
      .expect(201)
    expect(created.body.lecture).toEqual({ id: expect.any(Number), title: 'Nectar of Devotion seminar', speaker: 'Govinda Dāsa', uses: 0 })
    await coordinator.post('/api/library/lectures').send({ title: 'nectar of devotion seminar', speaker: 'govinda dāsa' }).expect(409)
    const other = await coordinator.post('/api/library/lectures').send({ title: 'Nectar of Devotion seminar', speaker: 'Lalitā Devī Dāsī' }).expect(201)
    const edited = await coordinator
      .put(`/api/library/lectures/${created.body.lecture.id}`)
      .send({ title: 'Nectar of Devotion seminar', speaker: 'Govinda Dāsa', source: 'Temple' })
      .expect(200)
    expect(edited.body.lecture.source).toBe('Temple')
    await coordinator.delete(`/api/library/lectures/${other.body.lecture.id}`).expect(204)
  })

  it('keeps devotees from changing the library and is 401 when signed out', async () => {
    await devotee.post('/api/library/books').send({ title: 'Mine' }).expect(403)
    await devotee.delete('/api/library/books/1').expect(403)
    await request(ctx.app).get('/api/library').expect(401)
  })
})
