import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './AuthContext'
import { returnPath } from './returnPath'

export function PublicOnly() {
  const { state } = useAuth()
  const location = useLocation()
  if (state.status === 'loading') return null
  if (state.status === 'signed-in') return <Navigate to={returnPath(location.state)} replace />
  return <Outlet />
}
