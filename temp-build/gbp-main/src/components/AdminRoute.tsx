import { Navigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // Verifica se o usuário está autenticado e tem nível de acesso admin
  if (!user || user.nivel_acesso?.toLowerCase() !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

export default AdminRoute;
