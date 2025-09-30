import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { usePermissions } from '../../hooks/usePermissions';
import { useCompanyStore } from '../../store/useCompanyStore';
import React from 'react';

export function ProtectedRoute() {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const company = useCompanyStore((state) => state.company);
  const [state, setState] = useState({
    isAuthenticated: !!user,
    hasCompany: !!company,
    hasPermission: hasPermission(location.pathname),
    isAdmin
  });

  useEffect(() => {
    console.log('ProtectedRoute - State updated:', {
      path: location.pathname,
      isAuthenticated: !!user,
      hasCompany: !!company,
      hasPermission: hasPermission(location.pathname),
      isAdmin,
      user,
      company
    });

    setState({
      isAuthenticated: !!user,
      hasCompany: !!company,
      hasPermission: hasPermission(location.pathname),
      isAdmin
    });
  }, [user, company, location.pathname, hasPermission, isAdmin]);

  if (isLoading) {
    return null;
  }

  // Se não estiver autenticado, redireciona para o login
  if (!state.isAuthenticated) {
    console.log('ProtectedRoute - User not authenticated, redirecting to login');
    return <Navigate to="/login" />;
  }

  // Se não tiver empresa selecionada, redireciona para seleção de empresa
  if (!state.hasCompany) {
    console.log('ProtectedRoute - No company selected, redirecting to company selection');
    return <Navigate to="/select-company" />;
  }

  // Se não tiver permissão e não for admin, redireciona para o dashboard
  if (!state.hasPermission && !state.isAdmin) {
    console.log('ProtectedRoute - User lacks permission and is not admin, redirecting to dashboard');
    return <Navigate to="/app/dashboard" />;
  }

  return <Outlet />;
}

export const ProtectedRouteComponent = React.memo(ProtectedRoute);
