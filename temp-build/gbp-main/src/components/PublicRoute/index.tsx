import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';

export function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  // Se estiver carregando, mostra um indicador de carregamento
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Se estiver autenticado, redireciona para o dashboard
  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  // Se não estiver autenticado, permite acesso à rota pública
  return <Outlet />;
}
