import cookieParser from 'cookie-parser'
import { sql } from 'drizzle-orm'
import express, { type Express } from 'express'
import helmet from 'helmet'
import { join } from 'node:path'
import { pinoHttp } from 'pino-http'
import { authRoutes } from './auth/routes'
import type { Config } from './config'
import type { Db } from './db/client'
import { rejectCrossSite } from './http/csrf'
import { describeError, errorHandler, notFound } from './http/errors'
import type { Logger } from './logger'
import { adminRoutes } from './routes/admin'
import { devoteeRoutes } from './routes/devotees'
import { libraryRoutes } from './routes/library'
import { meRoutes } from './routes/me'
import { reportRoutes } from './routes/report'

export interface AppContext {
  db: Db
  config: Config
  logger: Logger
}

export function createApp(ctx: AppContext): Express {
  const app = express()
  app.disable('x-powered-by')
  if (ctx.config.trustProxy !== false) app.set('trust proxy', ctx.config.trustProxy)

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
    }),
  )
  app.use(
    pinoHttp({
      logger: ctx.logger,
      autoLogging: ctx.config.nodeEnv !== 'test',
      // Only what an operator needs; headers would carry session cookies.
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  )
  app.use(express.json({ limit: '64kb' }))
  app.use(cookieParser())

  app.use('/api', rejectCrossSite(ctx.config.trustProxy !== false), (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })
  app.get('/api/health', async (_req, res) => {
    try {
      await ctx.db.execute(sql`select 1`)
      res.json({ ok: true })
    } catch (error) {
      ctx.logger.error({ err: describeError(error) }, 'Database unavailable')
      res.status(503).json({ ok: false })
    }
  })
  app.use('/api/auth', authRoutes(ctx))
  app.use('/api/me', meRoutes(ctx))
  app.use('/api/library', libraryRoutes(ctx))
  app.use('/api', reportRoutes(ctx))
  app.use('/api/devotees', devoteeRoutes(ctx))
  app.use('/api/admin', adminRoutes(ctx))
  app.use('/api', notFound)

  if (ctx.config.webDist) {
    const webDist = ctx.config.webDist
    // Vite names assets by content hash, so browsers may keep them for a year; the page that points at them is always revalidated.
    app.use('/assets', express.static(join(webDist, 'assets'), { index: false, immutable: true, maxAge: '1y' }))
    app.use(express.static(webDist, { index: false, maxAge: '1h' }))
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(join(webDist, 'index.html'), { cacheControl: false, headers: { 'Cache-Control': 'no-cache' } })
    })
  }

  app.use(errorHandler(ctx.logger))
  return app
}
