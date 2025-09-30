import { supabaseClient } from '../lib/supabase';

type PesquisaCandidato = {
  uid: string;
  pesquisa_uid: string;
  candidato_uid: string;
  votos_iniciais: number;
  created_at: string;
  updated_at: string;
  candidato_nome?: string;
  candidato_numero?: string;
  cargo?: string;
  partido?: string;
};

export const pesquisaCandidatoService = {
  async obterCandidatosPorPesquisa(pesquisaId: string): Promise<PesquisaCandidato[]> {
    console.log(`[pesquisaCandidatoService] Buscando candidatos para pesquisa: ${pesquisaId}`);
    
    if (!pesquisaId) {
      console.error('ID da pesquisa não fornecido');
      return [];
    }

    try {
      const { data, error } = await supabaseClient
        .from('ps_gbp_pesquisa_candidatos')
        .select(`
          *,
          candidato:ps_gbp_candidatos(
            nome,
            numero,
            cargo,
            partido
          )
        `)
        .eq('pesquisa_uid', pesquisaId)
        .order('votos_iniciais', { ascending: false });

      if (error) {
        console.error('Erro ao buscar candidatos da pesquisa:', error);
        throw error;
      }

      // Mapear os dados para incluir as informações do candidato no objeto principal
      const candidatosProcessados = (data || []).map(item => ({
        ...item,
        candidato_nome: item.candidato?.nome || 'Candidato não encontrado',
        candidato_numero: item.candidato?.numero || '',
        cargo: item.candidato?.cargo || 'Cargo não informado',
        partido: item.candidato?.partido || 'Partido não informado'
      }));

      console.log(`[pesquisaCandidatoService] Candidatos encontrados:`, candidatosProcessados.length);
      return candidatosProcessados as PesquisaCandidato[];
    } catch (error) {
      console.error('Erro ao buscar candidatos da pesquisa:', error);
      throw error;
    }
  },

  async atualizarVotosCandidato(uid: string, votos: number): Promise<void> {
    try {
      const { error } = await supabaseClient
        .from('ps_gbp_pesquisa_candidatos')
        .update({ 
          votos_iniciais: votos,
          updated_at: new Date().toISOString()
        })
        .eq('uid', uid);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar votos do candidato:', error);
      throw error;
    }
  }
};
