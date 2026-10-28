import { z } from 'zod'
import { ApiError } from '../api/client'
import type { Dictionary } from '../i18n/en'

export { LoginSchema, ResetRequestSchema, type LoginInput, type ResetRequestInput } from '@sadhana/contract'

// Messages stay English here, like the shared schemas'; the fields show them in the current language.
export const NewPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your one-time password'),
    newPassword: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string(),
  })
  .refine((input) => input.newPassword === input.confirm, { path: ['confirm'], error: "Passwords don't match" })
export type NewPasswordInput = z.infer<typeof NewPasswordSchema>

export function loginErrorMessage(t: Dictionary, error: unknown): string {
  if (!(error instanceof ApiError)) return t.auth.unreachable
  if (error.status === 401) return t.auth.wrongCredentials
  if (error.status === 403) return t.auth.inactive
  if (error.status === 429) return t.auth.tooMany
  return t.auth.unknown
}
