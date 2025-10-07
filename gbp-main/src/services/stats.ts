import { supabaseClient } from '../lib/supabase';

export interface UserStats {
  totalEleitores: number;
  totalAtendimentos: number;
}

export const statsService = {
  // Busca stats de todos os usuários de uma empresa de uma vez (OTIMIZADO)
  async getAllUsersStats(empresaId: string): Promise<Record<string, UserStats>> {
    try {
      console.log('Buscando stats de todos os usuários para empresa:', empresaId);

      const { data, error } = await supabaseClient
        .rpc('get_users_stats', { p_empresa_uid: empresaId });

      if (error) {
        console.error('Erro ao buscar stats:', error);
        return {};
      }

      const stats: Record<string, UserStats> = {};
      
      if (data) {
        data.forEach((row: any) => {
          stats[row.usuario_uid] = {
            totalEleitores: Number(row.total_eleitores) || 0,
            totalAtendimentos: Number(row.total_atendimentos) || 0
          };
        });
      }

      console.log('Stats carregadas:', stats);
      return stats;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return {};
    }
  },

  // Mantém a função individual para compatibilidade (usa a versão otimizada internamente)
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
