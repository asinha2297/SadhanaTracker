import { Router } from 'express'
import type { AppContext } from '../app'
import { groups } from '../db/schema'

export function publicRoutes(ctx: AppContext): Router {
  const router = Router()

  router.get('/groups/public', async (_req, res) => {
    const rows = await ctx.db.select({ id: groups.id, name: groups.name }).from(groups).orderBy(groups.name)
    res.json({ groups: rows })
  })

  return router
}
