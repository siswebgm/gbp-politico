import { supabaseClient } from '../lib/supabase';
import { ParticipanteStats, ParticipanteFiltros } from '../types/pesquisaStats';

// Função auxiliar para normalizar números de telefone
function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  // Remove todos os caracteres não numéricos
  return phone.replace(/\D/g, '');
}

export const pesquisaStatsService = {
  // Função auxiliar para retornar estatísticas vazias
  getEmptyStats(): ParticipanteStats {
    return {
      totalParticipantes: 0,
      porCidade: [],
      porBairro: [],
      comparacaoEleitores: {
        totalParticipantes: 0,
        totalEleitores: 0,
        correspondencias: 0,
        semCorrespondencia: 0,
        taxaCorrespondencia: 0
      },
      porPesquisa: [],
      porData: []
    };
  },
  async getStats(empresa_uid: string, filtros: ParticipanteFiltros = {}): Promise<ParticipanteStats> {
    if (!empresa_uid) {
      throw new Error('empresa_uid é obrigatório');
    }

    try {
      // Primeiro, buscar participantes únicos que responderam à pesquisa
      let queryRespostas = supabaseClient
        .from('ps_gbp_respostas')
        .select(`
          participante_uid,
          pesquisa_uid,
          participante:participante_uid (
            uid,
            nome,
            telefone,
            email,
            cidade,
            bairro,
            empresa_uid,
            dados_completos,
            created_at
          ),
          created_at
        `)
        .eq('empresa_uid', empresa_uid);
      
      // Aplicar filtro de pesquisa se fornecido
      if (filtros.pesquisa_uid) {
        queryRespostas = queryRespostas.eq('pesquisa_uid', filtros.pesquisa_uid);
      }

      // Executar a query de respostas
      const { data: respostas, error: errorRespostas } = await queryRespostas;

      if (errorRespostas) throw errorRespostas;
      if (!respostas || respostas.length === 0) return this.getEmptyStats();
      
      // Usar um Map para armazenar participantes únicos
      const participantesMap = new Map<string, any>();
      
      // Processar cada resposta para obter participantes únicos
      respostas.forEach((resposta: any) => {
        const participante = resposta.participante;
        if (!participante || !participante.uid) return;
        
        // Se o participante já está no mapa, apenas atualizamos a data da última resposta se for mais recente
        if (participantesMap.has(participante.uid)) {
          const participanteExistente = participantesMap.get(participante.uid);
          if (new Date(resposta.created_at) > new Date(participanteExistente.ultima_resposta)) {
            participanteExistente.ultima_resposta = resposta.created_at;
            // Atualiza os dados com os da resposta mais recente
            Object.assign(participanteExistente, {
              nome: participante.nome || participanteExistente.nome,
              telefone: participante.telefone || participanteExistente.telefone,
              cidade: participante.cidade || participanteExistente.cidade,
              bairro: participante.bairro || participanteExistente.bairro,
              email: participante.email || participanteExistente.email,
              dados_completos: participante.dados_completos || participanteExistente.dados_completos
            });
          }
        } else {
          // Novo participante, adicionamos ao mapa
          participantesMap.set(participante.uid, {
            ...participante,
            ultima_resposta: resposta.created_at
          });
        }
      });
      
      // Converter o mapa para array de participantes
      const todosParticipantes = Array.from(participantesMap.values());
      
      // Garantir que temos participantes únicos
      const participantesUnicos = Array.from(new Map(
        todosParticipantes.map(participante => [participante.uid, participante])
      ).values());

      // Processar dados por cidade e bairro localmente
      const statsPorLocalizacao = participantesUnicos.reduce((acc, { cidade, bairro }) => {
        const cidadeKey = cidade || 'Não informada';
        
        // Atualizar contagem por cidade
        if (!acc.cidades[cidadeKey]) {
          acc.cidades[cidadeKey] = 0;
        }
        acc.cidades[cidadeKey]++;
        
        // Atualizar contagem por bairro (apenas se tiver cidade e bairro)
        if (cidade && bairro) {
          const bairroKey = `${cidade}|${bairro}`;
          if (!acc.bairros[bairroKey]) {
            acc.bairros[bairroKey] = { cidade, bairro, total: 0 };
          }
          acc.bairros[bairroKey].total++;
        }
        
        return acc;
      }, { cidades: {} as Record<string, number>, bairros: {} as Record<string, {cidade: string, bairro: string, total: number}> });

      // Converter para o formato esperado
      const porCidade: Array<{cidade: string, total: number}> = Object.entries(statsPorLocalizacao.cidades).map(([cidade, total]) => ({
        cidade,
        total: Number(total) || 0
      }));

      const porBairro: Array<{cidade: string, bairro: string, total: number}> = Object.values(statsPorLocalizacao.bairros);
      const totalParticipantes = participantesUnicos.length;

      // Já temos os dados processados localmente
      // Agora vamos buscar a comparação com eleitores

      // Variável para armazenar o resultado da comparação com eleitores
      let comparacaoEleitores = {
        totalParticipantes: 0,
        totalEleitores: 0,
        correspondencias: 0,
        semCorrespondencia: 0,
        taxaCorrespondencia: 0
      };

      try {
        console.log('[getStats] Iniciando comparação com base de eleitores');
        const params: any = { 
          empresa_id: empresa_uid,
          pesquisa_uid: filtros.pesquisa_uid || null 
        };
        
        console.log('[getStats] Parâmetros para a função RPC:', params);
        
        const { data: rpcResult, error: errorComparacao } = await supabaseClient
          .rpc('comparar_participantes_eleitores', params);

        console.log('[getStats] Resposta da função RPC:', { data: rpcResult, error: errorComparacao });

        if (errorComparacao || !rpcResult) {
          console.error('Erro ao comparar com eleitores, acionando fallback:', errorComparacao);
          throw errorComparacao || new Error('Dados de comparação não retornados');
        }
        
        // Se chegou aqui, a função RPC retornou com sucesso
        console.log('[getStats] Dados de comparação recebidos:', rpcResult);
        
        // Atualizar os dados de comparação com o resultado da RPC
        if (Array.isArray(rpcResult) && rpcResult.length > 0) {
          comparacaoEleitores = {
            totalParticipantes: Number(rpcResult[0].total_participantes) || 0,
            totalEleitores: Number(rpcResult[0].total_eleitores) || 0,
            correspondencias: Number(rpcResult[0].correspondencias) || 0,
            semCorrespondencia: Number(rpcResult[0].sem_correspondencia) || 0,
            taxaCorrespondencia: Number(rpcResult[0].taxa_correspondencia) || 0
          };
        } else if (typeof rpcResult === 'object' && rpcResult !== null) {
          // Se for um único objeto em vez de array
          comparacaoEleitores = {
            totalParticipantes: Number((rpcResult as any).total_participantes) || 0,
            totalEleitores: Number((rpcResult as any).total_eleitores) || 0,
            correspondencias: Number((rpcResult as any).correspondencias) || 0,
            semCorrespondencia: Number((rpcResult as any).sem_correspondencia) || 0,
            taxaCorrespondencia: Number((rpcResult as any).taxa_correspondencia) || 0
          };
        }
        
        console.log('[getStats] Dados de comparação processados:', comparacaoEleitores);
        
      } catch (error) {
        console.error('[getStats] Erro ao chamar função RPC, acionando fallback:', error);
        // Se a função RPC não existir ou falhar, vamos fazer a comparação manualmente
        return this.getStatsFallback(empresa_uid, {
          totalParticipantes: totalParticipantes || 0,
          porCidade: porCidade || [],
          porBairro: porBairro || [],
        }, filtros);
      }

      // Consulta para obter estatísticas por pesquisa
      let queryPesquisas = supabaseClient
        .from('ps_gbp_pesquisas')
        .select('uid, titulo, respostas:ps_gbp_respostas(participante_uid)')
        .eq('empresa_uid', empresa_uid);
      
      // Aplicar filtro de pesquisa se fornecido
      if (filtros.pesquisa_uid) {
        queryPesquisas = queryPesquisas.eq('uid', filtros.pesquisa_uid);
      }
      
      const { data: statsPorPesquisa, error: errorPesquisa } = await queryPesquisas;

      if (errorPesquisa) {
        console.error('Erro ao buscar estatísticas por pesquisa:', errorPesquisa);
      }

      // Inicializar com arrays vazios para evitar erros
      const porPesquisa = statsPorPesquisa?.map(pesquisa => ({
        pesquisa_uid: pesquisa.uid,
        pesquisa_nome: pesquisa.titulo || 'Sem título',
        total: Array.isArray(pesquisa.respostas) ? pesquisa.respostas.length : 0
      })) || [];

      // Consulta para obter estatísticas por data
      let queryPorData = supabaseClient
        .from('ps_gbp_participantes')
        .select('created_at, ps_gbp_pesquisas')
        .eq('empresa_uid', empresa_uid);
      
      // Aplicar filtro de pesquisa se fornecido
      if (filtros.pesquisa_uid) {
        queryPorData = queryPorData.eq('ps_gbp_pesquisas', filtros.pesquisa_uid);
      }
      
      const { data: statsPorData, error: errorData } = await queryPorData;

      if (errorData) {
        console.error('Erro ao buscar estatísticas por data:', errorData);
      }

      const porData = Array.from(
        (statsPorData || []).reduce((acc, { created_at }) => {
          if (!created_at) return acc;
          const date = new Date(created_at).toISOString().split('T')[0];
          const current = acc.get(date) || { data: date, total: 0 };
          current.total += 1;
          acc.set(date, current);
          return acc;
        }, new Map<string, { data: string; total: number }>())
        .values()
      ).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      return {
        totalParticipantes,
        porCidade,
        porBairro,
        comparacaoEleitores: comparacaoEleitores || {
          totalParticipantes: totalParticipantes || 0,
          totalEleitores: 0,
          correspondencias: 0,
          semCorrespondencia: 0,
          taxaCorrespondencia: 0
        },
        porPesquisa,
        porData
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de participantes:', error);
      throw error;
    }
  },

  async getStatsFallback(
    empresa_uid: string, 
    partialStats: Partial<ParticipanteStats> = {},
    filtros: ParticipanteFiltros = {}
  ): Promise<ParticipanteStats> {
    console.log('[getStatsFallback] Iniciando fallback para empresa:', empresa_uid, 'com filtros:', filtros);
    try {
      // Obter participantes únicos que responderam à pesquisa
      console.log('[getStatsFallback] Buscando participantes únicos para empresa:', empresa_uid);
      
      // Primeiro, buscar respostas para obter participantes únicos
      let queryRespostas = supabaseClient
        .from('ps_gbp_respostas')
        .select(`
          participante_uid,
          pesquisa_uid,
          participante:participante_uid (
            uid,
            telefone,
            empresa_uid
          )
        `)
        .eq('empresa_uid', empresa_uid);
      
      // Aplicar filtro de pesquisa se fornecido
      if (filtros.pesquisa_uid) {
        queryRespostas = queryRespostas.eq('pesquisa_uid', filtros.pesquisa_uid);
      }
      
      const { data: respostas, error: errorRespostas } = await queryRespostas;

      if (errorRespostas) {
        console.error('[getStatsFallback] Erro ao buscar respostas:', errorRespostas);
        throw errorRespostas;
      }
      
      console.log(`[getStatsFallback] Encontradas ${respostas?.length || 0} respostas`);
      
      // Usar um Set para armazenar participantes únicos
      const participantesUnicos = new Set<string>();
      const telefonesParticipantes = new Set<string>();
      
      // Processar respostas para obter participantes únicos
      if (respostas && respostas.length > 0) {
        respostas.forEach(resposta => {
          // Verificar se o participante existe e tem um UID
          if (resposta.participante && Array.isArray(resposta.participante) && resposta.participante.length > 0) {
            const participante = resposta.participante[0];
            if (!participante || !participante.uid) return;
            
            // Adicionar ao conjunto de participantes únicos
            participantesUnicos.add(participante.uid);
            
            // Adicionar telefone normalizado, se disponível
            if (participante.telefone) {
              const telefoneNormalizado = normalizePhoneNumber(participante.telefone);
              if (telefoneNormalizado.length >= 10) {
                telefonesParticipantes.add(telefoneNormalizado);
              }
            }
          }
        });
      }
      
      console.log(`[getStatsFallback] ${participantesUnicos.size} participantes únicos encontrados`);
      console.log(`[getStatsFallback] ${telefonesParticipantes.size} números de telefone válidos de participantes`);

      // Obter todos os eleitores com telefone ou whatsapp
      console.log('[getStatsFallback] Buscando eleitores com telefone ou whatsapp para empresa:', empresa_uid);
      const { data: eleitores, error: errorEleitores } = await supabaseClient
        .from('gbp_eleitores')
        .select('whatsapp, telefone')
        .or('whatsapp.not.is.null,telefone.not.is.null')
        .eq('empresa_uid', empresa_uid);

      if (errorEleitores) {
        console.error('[getStatsFallback] Erro ao buscar eleitores:', errorEleitores);
        throw errorEleitores;
      }
      
      console.log(`[getStatsFallback] Encontrados ${eleitores?.length || 0} eleitores com telefone ou whatsapp`);

      // Normalizar e filtrar telefones dos eleitores (tanto whatsapp quanto telefone)
      const telefonesEleitores = new Set(
        eleitores.flatMap(e => [
          e.whatsapp ? normalizePhoneNumber(e.whatsapp) : null,
          e.telefone ? normalizePhoneNumber(e.telefone) : null
        ].filter(Boolean) as string[])
        .filter(telefone => telefone.length >= 10) // Filtra números muito curtos
      );
      
      console.log(`[getStatsFallback] ${telefonesEleitores.size} números de telefone válidos de eleitores`);

      // Encontrar correspondências
      const telefonesParticipantesArray = Array.from(telefonesParticipantes);
      const telefonesEleitoresArray = Array.from(telefonesEleitores);
      console.log('[getStatsFallback] Procurando correspondências...');
      
      // Converter para minúsculas para comparação case-insensitive
      const telefonesEleitoresLower = new Set(
        telefonesEleitoresArray.map(tel => tel.toLowerCase())
      );
      
      // Contar correspondências
      const correspondencias = telefonesParticipantesArray.filter(tel => 
        telefonesEleitoresLower.has(tel.toLowerCase())
      ).length;

      const totalParticipantes = participantesUnicos.size;
      const totalEleitores = telefonesEleitores.size;
      const semCorrespondencia = Math.max(0, totalParticipantes - correspondencias);
      const taxaCorrespondencia = totalParticipantes > 0 
        ? parseFloat(((correspondencias / totalParticipantes) * 100).toFixed(2))
        : 0;
          
      console.log(`[getStatsFallback] Estatísticas finais:`, {
        totalParticipantes,
        totalEleitores,
        correspondencias,
        semCorrespondencia,
        taxaCorrespondencia
      });

      // Garantir que temos valores padrão para todos os campos obrigatórios
      const stats: ParticipanteStats = {
        totalParticipantes: participantesUnicos.size,
        porCidade: Array.isArray(partialStats.porCidade) ? partialStats.porCidade : [],
        porBairro: Array.isArray(partialStats.porBairro) ? partialStats.porBairro : [],
        comparacaoEleitores: {
          totalParticipantes: totalParticipantes,
          totalEleitores: totalEleitores,
          correspondencias: correspondencias,
          semCorrespondencia: semCorrespondencia,
          taxaCorrespondencia: taxaCorrespondencia
        },
        porPesquisa: Array.isArray(partialStats.porPesquisa) ? partialStats.porPesquisa : [],
        porData: Array.isArray(partialStats.porData) ? partialStats.porData : []
      };
      
      return stats;
    } catch (error) {
      console.error('Erro no fallback de estatísticas:', error);
      return {
        totalParticipantes: 0,
        porCidade: [],
        porBairro: [],
        comparacaoEleitores: {
          totalParticipantes: 0,
          totalEleitores: 0,
          correspondencias: 0,
          semCorrespondencia: 0,
          taxaCorrespondencia: 0
        },
        porPesquisa: [],
        porData: []
      };
    }
  }
};
