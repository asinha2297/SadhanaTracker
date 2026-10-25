import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { clearQueue } from '../lib/syncQueue'
import { fetchSession, logout, logoutEverywhere, type SessionUser } from './session'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: SessionUser }

/** This device only, or every device the devotee is signed in on. */
export type SignOutScope = 'device' | 'everywhere'

export interface AuthContextValue {
  state: AuthState
  setUser: (user: SessionUser) => void
  signOut: (scope?: SignOutScope) => Promise<void>
}

const SIGNED_OUT: AuthState = { status: 'signed-out' }

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    fetchSession()
      .then((user) => setState(user ? { status: 'signed-in', user } : SIGNED_OUT))
      .catch(() => setState(SIGNED_OUT))
  }, [])

  const value: AuthContextValue = {
    state,
    setUser: (user) => setState({ status: 'signed-in', user }),
    // A shared device must keep nothing of the previous devotee: no cached records, no queued entries.
    signOut: async (scope = 'device') => {
      await (scope === 'everywhere' ? logoutEverywhere() : logout()).catch(() => undefined)
      setState(SIGNED_OUT)
      queryClient.clear()
      await clearQueue().catch(() => undefined)
    },
  }

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}

export function useUser(): SessionUser {
  const { state } = useAuth()
  if (state.status !== 'signed-in') throw new Error('useUser needs a signed-in session')
  return state.user
}
