import { z } from 'zod'
import { ApiError } from '../api/client'

export { LoginSchema, ResetRequestSchema, type LoginInput, type ResetRequestInput } from '@sadhana/contract'

export const NewPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your one-time password'),
    newPassword: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string(),
  })
  .refine((input) => input.newPassword === input.confirm, { path: ['confirm'], error: "Passwords don't match" })
export type NewPasswordInput = z.infer<typeof NewPasswordSchema>

const FAILURES: Record<number, string> = {
  401: "That email or mobile number and password don't match. Please try again.",
  403: 'This account is inactive. Please speak with your coordinator.',
  429: 'Too many attempts. Please wait a few minutes and try again.',
}

export function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "We couldn't reach the server. Check your connection and try again."
  return FAILURES[error.status] ?? "We couldn't sign you in just now. Please try again in a moment."
}
