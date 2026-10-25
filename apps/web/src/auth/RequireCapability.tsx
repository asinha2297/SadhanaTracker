import { hasCapability, type Capability } from '@sadhana/domain'
import { Navigate, Outlet } from 'react-router'
import { useUser } from './AuthContext'

export function RequireCapability({ capability }: { capability: Capability }) {
  const user = useUser()
  return hasCapability(user.role, capability) ? <Outlet /> : <Navigate to="/" replace />
}
