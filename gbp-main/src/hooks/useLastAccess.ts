import { useEffect } from 'react';
import { supabaseClient } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

export function useLastAccess() {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const updateLastAccess = async () => {
      if (!user?.id) return;

      try {
        const { error } = await supabaseClient
          .from('gbp_usuarios')
          .update({ ultimo_acesso: new Date().toISOString() })
          .eq('id', user.id);

        if (error) {
          console.error('Erro ao atualizar último acesso:', error);
        }
      } catch (error) {
        console.error('Erro ao atualizar último acesso:', error);
      }
    };

    // Atualiza quando o componente monta
    updateLastAccess();

    // Configura listeners para eventos de visibilidade e foco
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateLastAccess();
      }
    };

    const handleFocus = () => {
      updateLastAccess();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id]);
}
