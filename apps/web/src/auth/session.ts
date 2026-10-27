import { SessionUserSchema, type LoginInput, type SessionUser } from '@sadhana/contract'
import { z } from 'zod'
import { api, ApiError } from '../api/client'

export type { SessionUser }

const SessionResponseSchema = z.object({ user: SessionUserSchema })

async function userFrom(response: Response): Promise<SessionUser> {
  return SessionResponseSchema.parse(await response.json()).user
}

export async function fetchSession(): Promise<SessionUser | null> {
  try {
    return await userFrom(await api('/api/auth/session'))
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export async function login(credentials: LoginInput): Promise<SessionUser> {
  return userFrom(await api('/api/auth/login', { method: 'POST', body: credentials }))
}

export async function logout(): Promise<void> {
  await api('/api/auth/logout', { method: 'POST' })
}

export async function setPassword(currentPassword: string, newPassword: string): Promise<SessionUser> {
  return userFrom(await api('/api/auth/password', { method: 'POST', body: { currentPassword, newPassword } }))
}

export async function logoutEverywhere(): Promise<void> {
  await api('/api/auth/logout-all', { method: 'POST' })
}

export async function requestCode(phone: string): Promise<void> {
  await api('/api/auth/otp', { method: 'POST', body: { phone } })
}

export async function requestReset(identifier: string): Promise<void> {
  await api('/api/auth/reset-request', { method: 'POST', body: { identifier } })
}
