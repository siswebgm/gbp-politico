import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabaseClient } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth: boolean;
}

export function AuthGuard({ children, requireAuth }: AuthGuardProps) {
  const { isAuthenticated, user, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user?.id) return;

      const { data, error } = await supabaseClient
        .from('gbp_usuarios')
        .select('status')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao verificar status do usuário:', error);
        return;
      }

      if (data.status === 'blocked' || data.status === 'pending') {
        const message = data.status === 'blocked' 
          ? 'Sua conta está bloqueada. Entre em contato com o administrador.'
          : 'Sua conta está pendente de aprovação. Entre em contato com o administrador.';
          
        // Primeiro fazer logout para limpar os dados
        signOut();
        
        // Depois navegar para login e mostrar o toast
        navigate('/login', { replace: true });
        toast.error(message);
      }
    };

    if (isAuthenticated && pathname !== '/login') {
      checkUserStatus();
    }
  }, [isAuthenticated, user?.id, pathname, navigate, signOut]);

  const shouldRedirect = requireAuth ? !isAuthenticated : isAuthenticated;
  const redirectTo = requireAuth ? '/login' : '/app';

  if (shouldRedirect) {
    return <Navigate to={redirectTo} state={{ from: pathname }} replace />;
  }

  return <>{children}</>;
}
