import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { supabaseClient } from '../lib/supabase';

export function useUpdateLastAccess() {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const updateLastAccess = () => {
      if (!user?.id) return;

      supabaseClient
        .from('gbp_usuarios')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Erro ao atualizar último acesso:', error);
          }
        });
    };

    // Atualiza quando a página carrega
    updateLastAccess();

    // Atualiza quando a página é recarregada
    window.addEventListener('beforeunload', updateLastAccess);

    return () => {
      window.removeEventListener('beforeunload', updateLastAccess);
    };
  }, [user?.id]);
}
