import { BookInputSchema, LectureInputSchema } from '@sadhana/contract'
import { Router } from 'express'
import type { AppContext } from '../app'
import { requireAuth, requireCapability } from '../auth/middleware'
import { HttpError, validate } from '../http/errors'
import { param } from '../http/params'
import { createBook, createLecture, deleteBook, deleteLecture, library, updateBook, updateLecture } from '../services/library'

const idOf = (text: string): number => {
  if (!/^\d+$/.test(text)) throw new HttpError(404)
  return Number(text)
}

/** Everyone signed in reads the library; those who manage accounts also keep it. */
export function libraryRoutes(ctx: AppContext): Router {
  const router = Router()
  router.use(requireAuth(ctx))

  router.get('/', async (_req, res) => {
    res.json({ library: await library(ctx.db) })
  })

  router.use(requireCapability('MANAGE_ACCOUNTS'))

  router.post('/books', async (req, res) => {
    res.status(201).json({ book: await createBook(ctx.db, validate(BookInputSchema, req.body)) })
  })

  router.put('/books/:id', async (req, res) => {
    res.json({ book: await updateBook(ctx.db, idOf(param(req, 'id')), validate(BookInputSchema, req.body)) })
  })

  router.delete('/books/:id', async (req, res) => {
    await deleteBook(ctx.db, idOf(param(req, 'id')))
    res.status(204).end()
  })

  router.post('/lectures', async (req, res) => {
    res.status(201).json({ lecture: await createLecture(ctx.db, validate(LectureInputSchema, req.body)) })
  })

  router.put('/lectures/:id', async (req, res) => {
    res.json({ lecture: await updateLecture(ctx.db, idOf(param(req, 'id')), validate(LectureInputSchema, req.body)) })
  })

  router.delete('/lectures/:id', async (req, res) => {
    await deleteLecture(ctx.db, idOf(param(req, 'id')))
    res.status(204).end()
  })

  return router
}
