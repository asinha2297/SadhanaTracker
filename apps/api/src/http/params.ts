import type { Request } from 'express'
import { HttpError } from './errors'

export function param(req: Request<Record<string, string>>, name: string): string {
  const value = req.params[name]
  if (value === undefined) throw new HttpError(404)
  return value
}
