import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api, requestJson } from './client'
import { BookSchema, LectureSchema, LibrarySchema, type Book, type BookInput, type Lecture, type LectureInput } from './contract'

const BookResponse = z.object({ book: BookSchema })
const LectureResponse = z.object({ lecture: LectureSchema })

export const libraryQuery = queryOptions({
  queryKey: ['library'],
  queryFn: async () => (await requestJson('/api/library', z.object({ library: LibrarySchema }))).library,
})

export async function createBook(input: BookInput): Promise<Book> {
  return (await requestJson('/api/library/books', BookResponse, { method: 'POST', body: input })).book
}

export async function updateBook(id: number, input: BookInput): Promise<Book> {
  return (await requestJson(`/api/library/books/${id}`, BookResponse, { method: 'PUT', body: input })).book
}

export async function deleteBook(id: number): Promise<void> {
  await api(`/api/library/books/${id}`, { method: 'DELETE' })
}

export async function createLecture(input: LectureInput): Promise<Lecture> {
  return (await requestJson('/api/library/lectures', LectureResponse, { method: 'POST', body: input })).lecture
}

export async function updateLecture(id: number, input: LectureInput): Promise<Lecture> {
  return (await requestJson(`/api/library/lectures/${id}`, LectureResponse, { method: 'PUT', body: input })).lecture
}

export async function deleteLecture(id: number): Promise<void> {
  await api(`/api/library/lectures/${id}`, { method: 'DELETE' })
}
