import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { useCompanyStore } from '../../store/useCompanyStore';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const location = useLocation();

  console.log('[DEBUG] PrivateRoute:', { 
    isAuthenticated, 
    isLoading, 
    hasCompany: !!company,
    companyId: company?.id,
    pathname: location.pathname
  });

  if (isLoading) {
    console.log('[DEBUG] PrivateRoute: Loading...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('[DEBUG] PrivateRoute: Not authenticated, redirecting to login');
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (!company?.id) {
    console.log('[DEBUG] PrivateRoute: No valid company found');
    localStorage.removeItem('company-storage');
    return <Navigate to="/select-company" replace />;
  }

  console.log('[DEBUG] PrivateRoute: Rendering protected content');
  return <>{children}</>;
}
