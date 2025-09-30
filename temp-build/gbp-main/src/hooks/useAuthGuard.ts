import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompanyStore } from '../store/useCompanyStore';
import { supabaseClient } from '../lib/supabase';
import { toast } from 'react-toastify';

export function useAuthGuard() {
  const navigate = useNavigate();
  const company = useCompanyStore((state) => state.company);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
          console.log('No session found, redirecting to login');
          toast.error('Você precisa estar logado para acessar esta página');
          navigate('/login');
          return;
        }

        if (!company?.id && location.pathname !== '/app/whatsapp' && location.pathname !== '/app/planos') {
          console.log('No company selected, redirecting to company selection');
          toast.error('Selecione uma empresa para continuar');
          navigate('/select-company');
          return;
        }

        // Verificar se o usuário tem acesso à empresa selecionada
        if (company?.id) {
          const { data: userCompany, error: companyError } = await supabaseClient
            .from('gbp_usuarios_empresas')
            .select('*')
            .eq('usuario_id', session.user.id)
            .eq('empresa_id', company.id)
            .single();

          if (companyError || !userCompany) {
            console.log('User does not have access to this company');
            toast.error('Você não tem acesso a esta empresa');
            navigate('/select-company');
            return;
          }
        }

      } catch (error) {
        console.error('Auth check error:', error);
        toast.error('Erro ao verificar autenticação');
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate, company?.id, location.pathname]);

  return null;
}
