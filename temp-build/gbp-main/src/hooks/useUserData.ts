import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

export function useUserData() {
  const { user } = useAuth();

  const { data: userData, isLoading } = useQuery({
    queryKey: ['user-data', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Não precisa buscar novamente pois o user já tem os dados necessários
      return {
        id: user.id,
        nome: user.nome,
        email: user.email,
        empresa_id: user.empresa_id
      };
    },
    enabled: !!user?.id,
  });

  return {
    userData,
    isLoading,
  };
}
