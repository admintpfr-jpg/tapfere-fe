import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

type Role = 'ADMIN' | 'CLIENT' | 'THERAPIST';

const roleHomePaths: Record<Role, string> = {
  ADMIN: '/admin/user-management',
  CLIENT: '/client',
  THERAPIST: '/therapist',
};

export function getRoleHomePath(): string {
  const token = localStorage.getItem('access_token');
  if (!token) return '/login';

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return roleHomePaths[user?.role as Role] ?? '/dashboard';
  } catch {
    return '/login';
  }
}

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: Role[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const token = localStorage.getItem('access_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0) {
    let userRole: string | null = null;

    try {
      userRole = JSON.parse(localStorage.getItem('user') || '{}')?.role ?? null;
    } catch {
      return <Navigate to="/login" replace />;
    }

    if (!userRole || !roles.includes(userRole as Role)) {
      const redirectPath = roleHomePaths[userRole as Role] ?? '/dashboard';
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
}
