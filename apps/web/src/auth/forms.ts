import { SignupInputSchema, type SignupInput } from '@sadhana/contract'
import { z } from 'zod'
import { ApiError } from '../api/client'

export { LoginSchema, ResetRequestSchema, type LoginInput, type ResetRequestInput } from '@sadhana/contract'

const passwordsMatch = { path: ['confirm'], error: "Passwords don't match" }

export const NewPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your one-time password'),
    newPassword: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string(),
  })
  .refine((input) => input.newPassword === input.confirm, passwordsMatch)
export type NewPasswordInput = z.infer<typeof NewPasswordSchema>

export const SignupSchema = SignupInputSchema.extend({ confirm: z.string() }).refine(
  (input) => input.password === input.confirm,
  passwordsMatch,
)
export type SignupFormValues = z.input<typeof SignupSchema>
export type SignupFormOutput = z.output<typeof SignupSchema>

export const toSignupInput = ({ confirm, ...input }: SignupFormOutput): SignupInput => input

const FAILURES: Record<number, string> = {
  401: "That email or mobile number and password don't match. Please try again.",
  403: 'This account is inactive. Please speak with your coordinator.',
  429: 'Too many attempts. Please wait a few minutes and try again.',
}

const Refusal = z.object({ reason: z.string() })

export function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "We couldn't reach the server. Check your connection and try again."
  if (error.status === 403 && Refusal.safeParse(error.body).data?.reason === 'PENDING') {
    return 'This account is awaiting approval from your coordinator. You will be able to sign in once it is approved.'
  }
  return FAILURES[error.status] ?? "We couldn't sign you in just now. Please try again in a moment."
}
