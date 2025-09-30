import { supabaseClient } from '../lib/supabase';

export interface UserStats {
  totalEleitores: number;
  totalAtendimentos: number;
}

export const statsService = {
  async getUserStats(userId: string, empresaId: string): Promise<UserStats> {
    try {
      console.log('Buscando stats para:', { userId, empresaId });

      // Buscar total de eleitores cadastrados pelo usuário
      const eleitoresQuery = await supabaseClient
        .from('gbp_eleitores')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_uid', empresaId)
        .eq('usuario_uid', userId);

      console.log('Resultado eleitores:', eleitoresQuery);

      // Buscar total de atendimentos realizados pelo usuário
      const atendimentosQuery = await supabaseClient
        .from('gbp_atendimentos')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_uid', empresaId)
        .eq('usuario_uid', userId);

      console.log('Resultado atendimentos:', atendimentosQuery);

      const totalEleitores = eleitoresQuery.count || 0;
      const totalAtendimentos = atendimentosQuery.count || 0;

      console.log('Totais:', { totalEleitores, totalAtendimentos });

      return {
        totalEleitores,
        totalAtendimentos
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas do usuário:', error);
      return {
        totalEleitores: 0,
        totalAtendimentos: 0
      };
    }
  }
};
