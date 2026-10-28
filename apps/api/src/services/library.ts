import { LIBRARY_DUPLICATE, type Book, type BookInput, type Lecture, type LectureInput, type Library } from '@sadhana/contract'
import { and, count, eq, ne, sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { books, hearingSessions, lectures, readingSessions } from '../db/schema'
import { HttpError } from '../http/errors'

const lower = (text: string) => text.toLowerCase()

const bookOf = (row: { id: number; title: string; uses: number }): Book => row

const lectureOf = (row: { id: number; title: string; speaker: string | null; source: string | null; uses: number }): Lecture => ({
  id: row.id,
  title: row.title,
  speaker: row.speaker ?? undefined,
  source: row.source ?? undefined,
  uses: row.uses,
})

const bookRows = (db: Db) =>
  db
    .select({ id: books.id, title: books.title, uses: count(readingSessions.id) })
    .from(books)
    .leftJoin(readingSessions, eq(readingSessions.bookId, books.id))
    .groupBy(books.id)

const lectureRows = (db: Db) =>
  db
    .select({ id: lectures.id, title: lectures.title, speaker: lectures.speaker, source: lectures.source, uses: count(hearingSessions.id) })
    .from(lectures)
    .leftJoin(hearingSessions, eq(hearingSessions.lectureId, lectures.id))
    .groupBy(lectures.id)

const byTitle = <T extends { title: string; speaker?: string | undefined }>(a: T, b: T) =>
  a.title.localeCompare(b.title) || (a.speaker ?? '').localeCompare(b.speaker ?? '')

/** Everything a devotee can pick from, alphabetical (sorted here: the database's collation knows no diacritics). */
export async function library(db: Db): Promise<Library> {
  return {
    books: (await bookRows(db)).map(bookOf).sort(byTitle),
    lectures: (await lectureRows(db)).map(lectureOf).sort(byTitle),
  }
}

const duplicate = (message: string) => new HttpError(409, { issues: [{ path: ['title'], message }] })

async function assertBookFree(db: Db, title: string, exceptId?: number): Promise<void> {
  const clash = eq(sql`lower(${books.title})`, lower(title))
  const [found] = await db
    .select({ id: books.id })
    .from(books)
    .where(exceptId === undefined ? clash : and(clash, ne(books.id, exceptId)))
  if (found) throw duplicate(LIBRARY_DUPLICATE.book)
}

async function assertLectureFree(db: Db, input: LectureInput, exceptId?: number): Promise<void> {
  const clash = and(
    eq(sql`lower(${lectures.title})`, lower(input.title)),
    eq(sql`lower(coalesce(${lectures.speaker}, ''))`, lower(input.speaker ?? '')),
  )
  const [found] = await db
    .select({ id: lectures.id })
    .from(lectures)
    .where(exceptId === undefined ? clash : and(clash, ne(lectures.id, exceptId)))
  if (found) throw duplicate(LIBRARY_DUPLICATE.lecture)
}

export async function createBook(db: Db, input: BookInput): Promise<Book> {
  await assertBookFree(db, input.title)
  const [row] = await db.insert(books).values({ title: input.title }).returning({ id: books.id, title: books.title })
  if (!row) throw new Error('Book was not saved')
  return { ...row, uses: 0 }
}

export async function updateBook(db: Db, id: number, input: BookInput): Promise<Book> {
  await assertBookFree(db, input.title, id)
  const [row] = await db.update(books).set({ title: input.title }).where(eq(books.id, id)).returning({ id: books.id })
  if (!row) throw new HttpError(404)
  const [book] = await bookRows(db).where(eq(books.id, id))
  if (!book) throw new HttpError(404)
  return bookOf(book)
}

export async function createLecture(db: Db, input: LectureInput): Promise<Lecture> {
  await assertLectureFree(db, input)
  const [row] = await db
    .insert(lectures)
    .values({ title: input.title, speaker: input.speaker ?? null, source: input.source ?? null })
    .returning({ id: lectures.id, title: lectures.title, speaker: lectures.speaker, source: lectures.source })
  if (!row) throw new Error('Lecture was not saved')
  return lectureOf({ ...row, uses: 0 })
}

export async function updateLecture(db: Db, id: number, input: LectureInput): Promise<Lecture> {
  await assertLectureFree(db, input, id)
  const [row] = await db
    .update(lectures)
    .set({ title: input.title, speaker: input.speaker ?? null, source: input.source ?? null })
    .where(eq(lectures.id, id))
    .returning({ id: lectures.id })
  if (!row) throw new HttpError(404)
  const [lecture] = await lectureRows(db).where(eq(lectures.id, id))
  if (!lecture) throw new HttpError(404)
  return lectureOf(lecture)
}

/** Removes an item nobody has recorded; one in use stays (409 with the count), since history must keep its name. */
export async function deleteBook(db: Db, id: number): Promise<void> {
  const [book] = await bookRows(db).where(eq(books.id, id))
  if (!book) throw new HttpError(404)
  if (book.uses > 0) throw new HttpError(409, { reason: 'IN_USE', uses: book.uses })
  await db.delete(books).where(eq(books.id, id))
}

export async function deleteLecture(db: Db, id: number): Promise<void> {
  const [lecture] = await lectureRows(db).where(eq(lectures.id, id))
  if (!lecture) throw new HttpError(404)
  if (lecture.uses > 0) throw new HttpError(409, { reason: 'IN_USE', uses: lecture.uses })
  await db.delete(lectures).where(eq(lectures.id, id))
}
