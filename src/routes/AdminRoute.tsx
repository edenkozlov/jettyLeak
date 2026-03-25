import { Navigate, Outlet } from 'react-router'

import useAuth from '@/hooks/auth/useAuth'

export default function AdminRoute() {
  const { role } = useAuth()

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
