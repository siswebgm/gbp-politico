import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth: boolean;
}

export function AuthGuard({ children, requireAuth }: AuthGuardProps) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated && requireAuth) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, requireAuth, navigate]);

  // If auth is required and user is not logged in, redirect to login
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If auth is not required and user is logged in, redirect to app
  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}