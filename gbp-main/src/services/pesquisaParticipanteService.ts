import { supabaseClient } from '../lib/supabase';

type DadosCompletos = {
  telefone?: string;
  cidade?: string;
  bairro?: string;
  nome?: string;
  endereco_completo?: {
    cidade?: string;
    bairro?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    cep?: string;
    estado?: string;
  };
  navegador?: {
    user_agent?: string;
    plataforma?: string;
    tela?: {
      largura?: number;
      altura?: number;
    };
  };
};

export interface ParticipantePesquisa {
  uid: string;
  pesquisa_uid: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  bairro: string;
  created_at: string;
  updated_at: string;
  respostas_count: number;
  ultima_resposta: string;
  dados_completos: DadosCompletos;
}

export const pesquisaParticipanteService = {
  async obterParticipantesPorPesquisa(
    pesquisaId: string, 
    empresaUid?: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ data: ParticipantePesquisa[], count: number | null }> {
    console.log(`[pesquisaParticipanteService] Buscando participantes para pesquisa: ${pesquisaId}, empresa: ${empresaUid}, página: ${offset / limit + 1}`);
    
    if (!pesquisaId) {
      console.error('ID da pesquisa não fornecido');
      return { data: [], count: 0 };
    }

    try {
      // Primeiro, obter o total de participantes
      const { count: total } = await supabaseClient
        .from('ps_gbp_respostas')
        .select('participante_uid', { count: 'exact', head: true })
        .eq('pesquisa_uid', pesquisaId);

      if (total === 0) {
        return { data: [], count: 0 };
      }

      // Buscar os IDs dos participantes com paginação
      const { data: respostas, error: errorRespostas } = await supabaseClient
        .from('ps_gbp_respostas')
        .select('participante_uid, created_at')
        .eq('pesquisa_uid', pesquisaId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (errorRespostas) {
        console.error('Erro ao buscar respostas:', errorRespostas);
        throw errorRespostas;
      }

      if (!respostas || respostas.length === 0) {
        return { data: [], count: total };
      }

      // Extrair IDs únicos dos participantes
      const participantesIds = [...new Set(respostas.map(r => r.participante_uid))];

      // Buscar os dados completos dos participantes
      const { data: participantes, error: errorParticipantes } = await supabaseClient
        .from('ps_gbp_participantes')
        .select('*')
        .in('uid', participantesIds)
        .eq('empresa_uid', empresaUid || '');

      if (errorParticipantes) {
        console.error('Erro ao buscar participantes:', errorParticipantes);
        throw errorParticipantes;
      }

      // Mapear para o formato de retorno esperado
      const participantesFormatados = (participantes || []).map(participante => {
        // Encontrar a última resposta deste participante
        const ultimaResposta = respostas
          .filter(r => r.participante_uid === participante.uid)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        let dadosCompletos: DadosCompletos = {};
        
        try {
          if (typeof participante.dados_completos === 'string') {
            dadosCompletos = JSON.parse(participante.dados_completos);
          } else if (participante.dados_completos) {
            dadosCompletos = participante.dados_completos;
          }
        } catch (e) {
          console.error('Erro ao processar dados_completos:', e);
        }

        // Formatar dados do participante
        const participanteFormatado: ParticipantePesquisa = {
          uid: participante.uid,
          nome: participante.nome || 'Anônimo',
          telefone: participante.telefone || '',
          email: participante.email || '',
          cidade: participante.cidade || dadosCompletos?.cidade || 'Não informado',
          bairro: participante.bairro || dadosCompletos?.bairro || 'Não informado',
          data_resposta: ultimaResposta?.created_at || participante.created_at,
          pesquisa_uid: pesquisaId,
          empresa_uid: participante.empresa_uid || '',
          dados_completos: dadosCompletos || {},
          respostas_count: respostas.filter(r => r.participante_uid === participante.uid).length,
          ultima_resposta: ultimaResposta?.created_at || participante.created_at,
          created_at: participante.created_at,
          updated_at: participante.updated_at || participante.created_at
        };

        return participanteFormatado;
      });

      // Ordenar por data da última resposta (mais recente primeiro)
      participantesFormatados.sort((a, b) => 
        new Date(b.ultima_resposta).getTime() - new Date(a.ultima_resposta).getTime()
      );

      return { 
        data: participantesFormatados, 
        count: total 
      };
    } catch (error) {
      console.error('Erro ao buscar participantes da pesquisa:', error);
      throw error;
    }
  },

  async obterRespostasDoParticipante(
    pesquisaId: string, 
    participanteUid: string, 
    empresaUid?: string
  ): Promise<Array<{
    id: string;
    pesquisa_uid: string;
    participante_uid: string;
    resposta: any;
    created_at: string;
    updated_at: string;
  }>> {
    try {
      const { data, error } = await supabaseClient
        .from('ps_gbp_respostas')
        .select('*')
        .eq('pesquisa_uid', pesquisaId)
        .eq('participante_uid', participanteUid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar respostas do participante:', error);
      throw error;
    }
  },
  
  async obterLocalizacoesDosParticipantes(
    pesquisaId: string,
    empresaUid?: string
  ): Promise<Array<{ cidade: string, total: number, porcentagem: number }>> {
    try {
      console.log(`[obterLocalizacoesDosParticipantes] Buscando localizações para pesquisa: ${pesquisaId}`);
      
      // Primeiro, obtemos todos os participantes da pesquisa
      const { data: respostas } = await supabaseClient
        .from('ps_gbp_respostas')
        .select('participante_uid')
        .eq('pesquisa_uid', pesquisaId);
      
      if (!respostas || respostas.length === 0) {
        return [];
      }
      
      const participantesIds = [...new Set(respostas.map(r => r.participante_uid))];
      console.log(`[obterLocalizacoesDosParticipantes] IDs dos participantes:`, participantesIds);
      
      // Buscar as localizações dos participantes
      const { data: participantes, error } = await supabaseClient
        .from('ps_gbp_participantes')
        .select('uid, cidade, dados_completos')
        .in('uid', participantesIds);
      
      if (error) {
        console.error('Erro ao buscar participantes:', error);
        throw error;
      }
      
      console.log(`[obterLocalizacoesDosParticipantes] Participantes encontrados:`, participantes);
      
      // Contabilizar as cidades
      const contagemCidades = new Map<string, number>();
      
      for (const participante of participantes || []) {
        let cidade = participante.cidade;
        
        // Se não tiver cidade no campo direto, tenta pegar dos dados_completos
        if (!cidade && participante.dados_completos) {
          try {
            const dados = typeof participante.dados_completos === 'string' 
              ? JSON.parse(participante.dados_completos) 
              : participante.dados_completos;
            
            cidade = dados.cidade || (dados.endereco_completo ? dados.endereco_completo.cidade : null);
          } catch (e) {
            console.error('Erro ao processar dados_completos:', e);
          }
        }
        
        // Ignorar cidades inválidas
        if (!cidade || typeof cidade !== 'string' || cidade.trim() === '') {
          continue;
        }
        
        cidade = cidade.trim();
        
        // Ignorar valores padrão de cidade não informada
        const cidadeMinuscula = cidade.toLowerCase();
        if ([
          'não informada', 'nao informada', 'n/a', 'null', 'undefined', 
          'não informado', 'nao informado', ''
        ].includes(cidadeMinuscula)) {
          continue;
        }
        
        // Contabilizar a cidade
        contagemCidades.set(cidade, (contagemCidades.get(cidade) || 0) + 1);
      }
      
      // Converter para array e calcular porcentagens
      const totalParticipantes = participantes?.length || 0;
      const localizacoes = Array.from(contagemCidades.entries())
        .map(([cidade, total]) => ({
          cidade,
          total,
          porcentagem: Math.round((total / totalParticipantes) * 100)
        }))
        .sort((a, b) => b.total - a.total); // Ordenar por total (maior primeiro)
      
      console.log(`[obterLocalizacoesDosParticipantes] Localizações encontradas:`, localizacoes);
      
      return localizacoes;
    } catch (error) {
      console.error('Erro ao buscar localizações dos participantes:', error);
      throw error;
    }
  }
};
