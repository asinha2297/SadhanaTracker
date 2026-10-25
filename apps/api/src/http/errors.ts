import { DrizzleQueryError } from 'drizzle-orm/errors'
import type { ErrorRequestHandler, RequestHandler } from 'express'
import type { z } from 'zod'
import type { Logger } from '../logger'

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(`HTTP ${status}`)
  }
}

export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new HttpError(400, {
      issues: result.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
    })
  }
  return result.data
}

export interface ErrorDescription {
  name: string
  message: string
  stack?: string
  cause?: string
}

const frames = (error: Error) =>
  error.stack
    ?.split('\n')
    .filter((line) => line.startsWith('    at '))
    .join('\n')

/** What the log needs to find a fault, without query parameters or anything else devotees entrusted to us. */
export function describeError(error: unknown): ErrorDescription {
  if (error instanceof DrizzleQueryError) {
    const cause = error.cause instanceof Error ? `${error.cause.name}: ${error.cause.message}` : undefined
    return { name: 'DrizzleQueryError', message: `Failed query: ${error.query}`, stack: frames(error), ...(cause && { cause }) }
  }
  if (error instanceof Error) return { name: error.name, message: error.message, stack: frames(error) }
  return { name: 'Error', message: String(error) }
}

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' })
}

export const errorHandler =
  (logger: Logger): ErrorRequestHandler =>
  (error: unknown, _req, res, _next) => {
    if (error instanceof HttpError) {
      res.status(error.status)
      if (error.body === undefined) res.end()
      else res.json(error.body)
      return
    }
    if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Malformed JSON' })
      return
    }
    logger.error({ err: describeError(error) }, 'Unhandled error')
    res.status(500).json({ error: 'Something went wrong on our side.' })
  }
