import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './AuthContext'

export function RequireAuth() {
  const { state } = useAuth()
  const { pathname } = useLocation()
  if (state.status === 'loading') return null
  if (state.status === 'signed-out') {
    return <Navigate to={pathname === '/' ? '/welcome' : '/login'} replace state={{ from: pathname }} />
  }
  return <Outlet />
}
