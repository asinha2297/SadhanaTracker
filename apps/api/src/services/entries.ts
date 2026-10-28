import type { EntryRecord } from '@sadhana/contract'
import type { DailyEntry, LocalDate } from '@sadhana/domain'
import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm'
import type { Db } from '../db/client'
import { books, entries, hearingSessions, lectures, readingSessions, type EntryRow } from '../db/schema'
import { HttpError } from '../http/errors'

/** The database or a transaction on it. */
type Executor = Pick<Db, 'select' | 'insert' | 'delete'>

/** Each row with its sessions in recorded order, carrying the names behind their ids. */
export async function recordsFor(db: Executor, rows: EntryRow[]): Promise<EntryRecord[]> {
  if (rows.length === 0) return []
  const ids = rows.map((row) => row.id)
  const reading = await db
    .select({
      entryId: readingSessions.entryId,
      bookId: readingSessions.bookId,
      bookTitle: books.title,
      chapterOrSection: readingSessions.chapterOrSection,
      minutes: readingSessions.minutes,
    })
    .from(readingSessions)
    .innerJoin(books, eq(books.id, readingSessions.bookId))
    .where(inArray(readingSessions.entryId, ids))
    .orderBy(asc(readingSessions.entryId), asc(readingSessions.position))
  const hearing = await db
    .select({
      entryId: hearingSessions.entryId,
      lectureId: hearingSessions.lectureId,
      lectureTitle: lectures.title,
      speaker: lectures.speaker,
      source: lectures.source,
      minutes: hearingSessions.minutes,
    })
    .from(hearingSessions)
    .innerJoin(lectures, eq(lectures.id, hearingSessions.lectureId))
    .where(inArray(hearingSessions.entryId, ids))
    .orderBy(asc(hearingSessions.entryId), asc(hearingSessions.position))
  return rows.map((row) => ({
    localDate: row.localDate,
    rounds: row.rounds,
    reflection: row.reflection ?? undefined,
    reading: reading
      .filter((session) => session.entryId === row.id)
      .map(({ entryId, chapterOrSection, ...session }) => ({ ...session, chapterOrSection: chapterOrSection ?? undefined })),
    hearing: hearing
      .filter((session) => session.entryId === row.id)
      .map(({ entryId, speaker, source, ...session }) => ({ ...session, speaker: speaker ?? undefined, source: source ?? undefined })),
    updatedAt: row.updatedAt.toISOString(),
  }))
}

export async function entriesBetween(db: Db, devoteeId: string, from: LocalDate, to: LocalDate): Promise<EntryRecord[]> {
  const rows = await db
    .select()
    .from(entries)
    .where(and(eq(entries.devoteeId, devoteeId), gte(entries.localDate, from), lte(entries.localDate, to)))
    .orderBy(asc(entries.localDate))
  return recordsFor(db, rows)
}

/** Refuses (400) a session that points at a book or lecture the library does not hold. */
export async function assertLibraryIds(db: Db, input: Pick<DailyEntry, 'reading' | 'hearing'>): Promise<void> {
  const wantedBooks = [...new Set(input.reading.map((session) => session.bookId))]
  const wantedLectures = [...new Set(input.hearing.map((session) => session.lectureId))]
  const ids = (rows: { id: number }[]) => new Set(rows.map((row) => row.id))
  const bookIds = ids(wantedBooks.length ? await db.select({ id: books.id }).from(books).where(inArray(books.id, wantedBooks)) : [])
  const lectureIds = ids(
    wantedLectures.length ? await db.select({ id: lectures.id }).from(lectures).where(inArray(lectures.id, wantedLectures)) : [],
  )
  const issues = [
    ...input.reading.flatMap((session, index) =>
      bookIds.has(session.bookId) ? [] : [{ path: ['reading', index, 'bookId'], message: 'Choose a book from the library' }],
    ),
    ...input.hearing.flatMap((session, index) =>
      lectureIds.has(session.lectureId) ? [] : [{ path: ['hearing', index, 'lectureId'], message: 'Choose a lecture from the library' }],
    ),
  ]
  if (issues.length) throw new HttpError(400, { issues })
}

/** Replaces the day's sessions with the ones submitted, in the order submitted. */
export async function saveSessions(db: Executor, entryId: number, input: Pick<DailyEntry, 'reading' | 'hearing'>): Promise<void> {
  await db.delete(readingSessions).where(eq(readingSessions.entryId, entryId))
  await db.delete(hearingSessions).where(eq(hearingSessions.entryId, entryId))
  if (input.reading.length) {
    await db.insert(readingSessions).values(
      input.reading.map((session, position) => ({
        entryId,
        position,
        bookId: session.bookId,
        chapterOrSection: session.chapterOrSection ?? null,
        minutes: session.minutes,
      })),
    )
  }
  if (input.hearing.length) {
    await db
      .insert(hearingSessions)
      .values(input.hearing.map((session, position) => ({ entryId, position, lectureId: session.lectureId, minutes: session.minutes })))
  }
}
