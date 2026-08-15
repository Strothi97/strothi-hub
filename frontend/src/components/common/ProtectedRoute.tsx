import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'

interface ProtectedRouteProps {
  adminOnly?: boolean
  requireTool?: string
}

export function ProtectedRoute({ adminOnly = false, requireTool }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, loading, hasToolAccess } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="page-loading">Lädt…</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />
  }

  if (requireTool && !hasToolAccess(requireTool)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
