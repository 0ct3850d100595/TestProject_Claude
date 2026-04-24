import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import type { Role } from '../api/types'

interface PrivateRouteProps {
  allowedRoles?: Role[]
}

export default function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
  const { token, employee } = useAuthStore()
  if (!token || !employee) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(employee.role)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
