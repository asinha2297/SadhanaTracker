import { Navigate, Outlet } from 'react-router'
import { useUser } from './AuthContext'

export function RequirePassword() {
  return useUser().mustChangePassword ? <Navigate to="/password" replace /> : <Outlet />
}
