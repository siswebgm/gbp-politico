import { supabaseClient } from '../lib/supabase';

export const lastAccessService = {
  async update(userId: number) {
    if (!userId) return;

    try {
      const now = new Date().toISOString();
      const { error } = await supabaseClient
        .from('gbp_usuarios')
        .update({ ultimo_acesso: now })
        .eq('id', userId);

      if (error) {
        console.error('Erro ao atualizar último acesso:', error);
      }
    } catch (error) {
      console.error('Erro ao atualizar último acesso:', error);
    }
  }
};
