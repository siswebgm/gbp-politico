import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

export function OwnerRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (!user || user.adm_empresa !== true) {
    console.log('[OwnerRoute] Acesso negado - Redirecionando para /app');
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

export default OwnerRoute;
