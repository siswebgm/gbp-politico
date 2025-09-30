import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCompany } from '../../hooks/useCompany';
import { AuthGuard } from '../AuthGuard';

interface CompanyGuardProps {
  children: ReactNode;
}

export function CompanyGuard({ children }: CompanyGuardProps) {
  const { hasCompany } = useCompany();
  const { pathname } = useLocation();

  return (
    <AuthGuard requireAuth={true}>
      {!hasCompany ? (
        <Navigate to="/select-company" state={{ from: pathname }} replace />
      ) : (
        children
      )}
    </AuthGuard>
  );
}
