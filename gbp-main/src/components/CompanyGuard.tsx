import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCompanyStore } from '../hooks/useCompanyContext';
import { useAuthStore } from '../store/useAuthStore';

interface CompanyGuardProps {
  children: React.ReactNode;
}

export function CompanyGuard({ children }: CompanyGuardProps) {
  const { currentCompanyId } = useCompanyStore();
  const { token } = useAuthStore();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!currentCompanyId) {
    return <Navigate to="/select-company" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}