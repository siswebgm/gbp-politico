import { supabaseClient } from '../lib/supabase';

// Tipos para os relatórios
export interface DadosRelatorioDemandas {
  totalDemandas: number;
  comDocumento: number;
  concluidas: {
    total: number;
    detalhes: Array<{
      uid: string;
      criado_em: string;
      demanda_concluida_data: string | null;
    }>;
  };
  porStatus: Record<string, number>;
  evolucaoMensal: Array<{
    mes: string;
    total: number;
  }>;
}

export interface FiltroRelatorioDemandas {
  inicio: string;
  fim: string;
}

export interface EnvioMensagemWhatsApp {
  data: string;
  mensagem: string;
  usuario_uid: string;
  usuario_nome: string;
}

export interface DemandaRua {
  uid: string;
  cpf?: string;
  empresa_uid: string;
  tipo_de_demanda: string;
  descricao_do_problema: string;
  nivel_de_urgencia: 'baixa' | 'média' | 'alta';
  logradouro: string;
  numero?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  referencia?: string;
  boletim_ocorrencia?: 'sim' | 'não';
  link_da_demanda?: string;
  fotos_do_problema?: string[];
  status: 'recebido' | 'feito_oficio' | 'protocolado' | 'aguardando' | 'concluido' | 'cancelado';
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
  aceite_termos: boolean;
  anexar_boletim_de_correncia?: string;
  numero_protocolo?: number;
  requerente_uid?: string;
  envios_mensagem_whatsapp?: string[]; // Array de strings JSON serializadas
  requerente_nome?: string;
  requerente_whatsapp?: string;
  requerente_cpf?: string;
  documento_protocolado?: string;
  observação_resposta?: string[];
  favorito?: boolean;
  // Relacionamentos
  requerente?: {
    nome: string;
    telefone?: string;
    email?: string;
  };
}

// Tipo para callback de mudanças em tempo real
type DemandaChangeCallback = (payload: any) => void;

export const demandasRuasService = {
  // Configurar assinatura de mudanças em tempo real
  subscribeToDemandas(empresaUid: string, callback: DemandaChangeCallback) {
    const subscription = supabaseClient
      .channel('demandas_ruas_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'gbp_demandas_ruas',
          filter: `empresa_uid=eq.${empresaUid}`
        }, 
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  // Buscar todas as demandas de rua
  async getDemandas(empresaUid: string): Promise<DemandaRua[]> {
    try {
      console.log('Buscando demandas para empresa:', empresaUid);
      
      // Buscamos as demandas com os dados do requerente via join
      const { data: demandas, error } = await supabaseClient
        .from('gbp_demandas_ruas')
        .select(`
          *,
          requerente:gbp_requerentes_demanda_rua (
            uid,
            nome,
            whatsapp,
            cpf,
            genero
          )
        `)
        .eq('empresa_uid', empresaUid)
        .order('criado_em', { ascending: false });

      if (error) {
        console.error('Erro ao buscar demandas:', error);
        throw error;
      }
      if (!demandas || demandas.length === 0) {
        console.log('Nenhuma demanda encontrada para a empresa:', empresaUid);
        return [];
      }

      console.log('Demandas encontradas:', demandas.length);
      
      // Mapear os dados para o formato esperado
      const demandasFormatadas = demandas.map((demanda) => {
        // Se tiver dados do requerente no relacionamento, usa eles
        const requerente = demanda.requerente ? {
          nome: demanda.requerente.nome,
          telefone: demanda.requerente.whatsapp,
          cpf: demanda.requerente.cpf,
          genero: demanda.requerente.genero
        } : null;

        return {
          ...demanda,
          requerente,
          // Mantém compatibilidade com código existente
          requerente_nome: requerente?.nome || '',
          requerente_whatsapp: requerente?.telefone || '',
          requerente_cpf: requerente?.cpf || ''
        };
      });

      return demandasFormatadas;
    } catch (error) {
      console.error('Erro ao buscar demandas:', error);
      throw error;
    }
  },

  // Buscar uma demanda específica por UID
  async getDemandaByUid(uid: string): Promise<DemandaRua | null> {
    console.log('Buscando demanda com UID:', uid);
    
    const { data, error } = await supabaseClient
      .from('gbp_demandas_ruas')
      .select(`
        *,
        requerente:requerente_uid (
          nome,
          cpf,
          whatsapp,
          genero,
          cep,
          logradouro,
          numero,
          bairro,
          cidade,
          uf,
          referencia
        )
      `)
      .eq('uid', uid)
      .single();

    console.log('Consulta ao banco - Dados retornados:', data);
    if (error) {
      console.error('Erro ao buscar demanda:', error);
      return null;
    }

    // Se tiver dados do requerente na tabela relacionada, usa eles
    if (data.requerente) {
      const demandaComRequerente = {
        ...data,
        requerente_nome: data.requerente.nome,
        requerente_cpf: data.requerente.cpf,
        requerente_whatsapp: data.requerente.whatsapp,
        requerente: {
          nome: data.requerente.nome,
          telefone: data.requerente.whatsapp,
          email: ''
        }
      };
      console.log('Dados da demanda com requerente:', demandaComRequerente);
      return demandaComRequerente;
    }

    console.log('Dados da demanda sem requerente:', data);
    return data;
  },

  // Criar uma nova demanda
  async createDemanda(demanda: Omit<DemandaRua, 'uid' | 'criado_em' | 'atualizado_em' | 'numero_protocolo'>): Promise<DemandaRua> {
    const { data, error } = await supabaseClient
      .from('gbp_demandas_ruas')
      .insert([demanda])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Atualizar uma demanda existente
  async updateDemanda(uid: string, updates: Partial<DemandaRua>): Promise<DemandaRua> {
    const { data, error } = await supabaseClient
      .from('gbp_demandas_ruas')
      .update({
        ...updates,
        atualizado_em: new Date().toISOString(),
      })
      .eq('uid', uid)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Excluir uma demanda
  async deleteDemanda(uid: string): Promise<void> {
    const { error } = await supabaseClient
      .from('gbp_demandas_ruas')
      .delete()
      .eq('uid', uid);

    if (error) throw error;
  },

  // Atualizar status de uma demanda
  async updateStatus(uid: string, status: DemandaRua['status'], observacao?: string): Promise<DemandaRua> {
    // Primeiro, obtemos a demanda atual para pegar as observações existentes
    const demandaAtual = await this.getDemandaByUid(uid);
    const updateData: Partial<DemandaRua> = { status };
    
    if (observacao) {
      // Se houver observação, adicionamos ao array existente
      const novasObservacoes = [
        ...(demandaAtual?.observação_resposta || []),
        `${new Date().toLocaleString()}: ${observacao}`
      ];
      updateData.observação_resposta = novasObservacoes;
    }

    return this.updateDemanda(uid, updateData);
  },

  // Upload de arquivo (boletim de ocorrência ou documento protocolado)
  async uploadFile(bucket: string, path: string, file: File, customFileName?: string): Promise<string> {
    try {
      let fileName: string;
      const fileExt = file.name.split('.').pop();
      
      if (customFileName) {
        fileName = customFileName.endsWith(`.${fileExt}`) ? customFileName : `${customFileName}.${fileExt}`;
      } else {
        fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      }
      
      const filePath = `${path}/${fileName}`.replace(/\/\//g, '/');

      // Set a 5-minute timeout for the upload
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minutes

      // Upload the file with error handling and timeout
      const { error: uploadError } = await supabaseClient.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          signal: controller.signal
        });

      clearTimeout(timeoutId);

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Falha no upload do arquivo: ${uploadError.message}`);
      }

      // Get public URL with cache busting
      const { data: { publicUrl } } = supabaseClient.storage
        .from(bucket)
        .getPublicUrl(filePath, {
          download: false
        });

      return publicUrl;
    } catch (error) {
      console.error('Error in uploadFile:', error);
      if (error.name === 'AbortError') {
        throw new Error('O upload do arquivo excedeu o tempo limite. Por favor, tente novamente com um arquivo menor ou verifique sua conexão de internet.');
      }
      throw error;
    }
  },

  // Alternar status de favorito de uma demanda
  async toggleFavorito(uid: string, favorito: boolean): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_demandas_ruas')
        .update({ favorito })
        .eq('uid', uid)
        .select()
        .single();

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      return false;
    }
  },

  // Função para testar a conexão com o Supabase
  async testarConexaoRPC(empresaUid: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        const { data, error } = await supabaseClient
          .rpc('testar_conexao', { empresa_id: empresaUid });
          
        if (error) {
          console.error('Erro ao testar conexão RPC:', error);
          resolve(false);
        } else {
          console.log('Teste de conexão RPC bem-sucedido:', data);
          resolve(true);
        }
      } catch (error) {
        console.error('Erro inesperado ao testar conexão RPC:', error);
        resolve(false);
      }
    });
  },

  // Salvar mensagem do WhatsApp na nova tabela
  async salvarMensagemWhatsApp(params: {
    empresaUid: string;
    demandaUid: string;
    mensagem: string;
    usuarioUid: string;
    usuarioNome: string;
    destinatarioWhatsapp: string;
    tipoMensagem?: string;
  }): Promise<any> {
    try {
      // Obter o usuário atual do localStorage
      const userData = JSON.parse(localStorage.getItem('gbp_user') || '{}');
      const usuarioUid = userData?.uid || null;
      
      // Preparar os dados para inserção
      const dadosInsercao = {
        empresa_uid: params.empresaUid,
        demanda_rua_uid: params.demandaUid,
        mensagem: params.mensagem,
        remetente_uid: params.usuarioUid,
        usuario_uid: usuarioUid,
        destinatario_whatsapp: params.destinatarioWhatsapp,
        tipo_mensagem: params.tipoMensagem || 'TEXTO',
        status: 'ENVIADA',
        data_envio: new Date().toISOString()
      };
      
      console.log('Tentando salvar mensagem com dados:', dadosInsercao);
      
      // Inserir os dados
      const { data, error } = await supabaseClient
        .from('gbp_whatsapp_demanda')
        .insert(dadosInsercao)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao salvar mensagem do WhatsApp:', error);
        throw new Error(`Erro ao salvar mensagem: ${error.message}`);
      }
      
      console.log('Mensagem salva com sucesso:', data);
      return data;
      
    } catch (error) {
      console.error('Erro no método salvarMensagemWhatsApp:', error);
      throw error;
    }
  },

  // Buscar mensagens do WhatsApp para uma demanda específica
  async getWhatsappMessages(demandaUid: string): Promise<any[]> {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_whatsapp_demanda')
        .select('mensagem, data_envio, tipo_mensagem, usuario_nome')
        .eq('demanda_rua_uid', demandaUid)
        .order('data_envio', { ascending: false });

      if (error) {
        console.error('Erro ao buscar mensagens do WhatsApp:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro no método getWhatsappMessages:', error);
      throw error;
    }
  },

  // Métodos para relatórios
  async getRelatorioDemandas(empresaUid: string, periodo: FiltroRelatorioDemandas): Promise<DadosRelatorioDemandas> {
    console.log('Iniciando getRelatorioDemandas', { empresaUid, periodo });
    
    try {
      // Verificar dados básicos para depuração
      console.log('Verificando dados básicos...');
      
      // 1. Verificar se existem demandas para a empresa
      const { count: qtdDemandas, error: countError } = await supabaseClient
        .from('gbp_demandas_ruas')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_uid', empresaUid);
      
      console.log(`Total de demandas para a empresa (${empresaUid}):`, qtdDemandas, 'Erro:', countError);
      
      // Se não houver dados, retornar vazio
      if (!qtdDemandas) {
        console.log(`Nenhuma demanda encontrada para a empresa`);
        return {
          totalDemandas: 0,
          comDocumento: 0,
          concluidas: { total: 0, detalhes: [] },
          porStatus: {},
          evolucaoMensal: []
        };
      }
      
      // 2. Buscar todas as demandas do período
      // 1. Buscar todas as demandas do período de uma vez
      console.log('Buscando todas as demandas...');
      console.log('Filtros:', {
        empresa_uid: empresaUid,
        data_inicio: periodo.inicio,
        data_fim: periodo.fim
      });
      
      let query = supabaseClient
        .from('gbp_demandas_ruas')
        .select('*', { count: 'exact' });
      
      // Aplicar filtros apenas se os valores forem válidos
      if (empresaUid) {
        query = query.eq('empresa_uid', empresaUid);
      }
      
      if (periodo.inicio) {
        // Garantir que a data de início inclui todo o dia
        const dataInicio = new Date(periodo.inicio);
        dataInicio.setHours(0, 0, 0, 0);
        query = query.gte('criado_em', dataInicio.toISOString());
      }
      
      if (periodo.fim) {
        // Garantir que a data de fim inclui todo o dia
        const dataFim = new Date(periodo.fim);
        dataFim.setHours(23, 59, 59, 999);
        query = query.lte('criado_em', dataFim.toISOString());
      }
      
      const { data: todasDemandas, count: totalDemandas, error: queryError } = await query;
      
      if (queryError) {
        console.error('Erro na consulta:', queryError);
        throw queryError;
      }
      
      console.log(`Total de demandas encontradas: ${totalDemandas || 0}`, { 
        empresaUid,
        dataInicio: periodo.inicio,
        dataFim: periodo.fim,
        totalDemandas: totalDemandas || 0
      });
      
      console.log(`Total de demandas encontradas: ${totalDemandas || 0}`);

      if (!todasDemandas || todasDemandas.length === 0) {
        console.log('Nenhuma demanda encontrada para o período');
        return {
          totalDemandas: 0,
          comDocumento: 0,
          concluidas: { total: 0, detalhes: [] },
          porStatus: {},
          evolucaoMensal: []
        };
      }

      // 2. Processar os dados localmente
      console.log('Processando dados localmente...');
      
      // Demandas com documento protocolado
      const comDocumento = todasDemandas.filter(d => d.documento_protocolado).length;
      
      // Demandas concluídas
      const concluidas = todasDemandas
        .filter(d => d.demanda_concluida)
        .map(({ uid, criado_em, demanda_concluida_data }) => ({
          uid,
          criado_em,
          demanda_concluida_data
        }));
      
      // Estatísticas por status
      const statusAgrupados = todasDemandas.reduce((acc: Record<string, number>, item) => {
        if (item.status) {
          acc[item.status] = (acc[item.status] || 0) + 1;
        }
        return acc;
      }, {});
      
      // Evolução mensal
      const evolucaoMensal = todasDemandas.reduce((acc: Record<string, number>, item) => {
        if (item.criado_em) {
          const date = new Date(item.criado_em);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          acc[key] = (acc[key] || 0) + 1;
        }
        return acc;
      }, {});
      
      const evolucaoMensalFormatada = Object.entries(evolucaoMensal).map(([mes, total]) => ({
        mes,
        total: total as number
      }));
      
      const resultado: DadosRelatorioDemandas = {
        totalDemandas: totalDemandas || 0,
        comDocumento,
        concluidas: {
          total: concluidas.length,
          detalhes: concluidas
        },
        porStatus: statusAgrupados,
        evolucaoMensal: evolucaoMensalFormatada
      };
      
      console.log('Relatório gerado com sucesso:', {
        totalDemandas: resultado.totalDemandas,
        comDocumento: resultado.comDocumento,
        concluidas: resultado.concluidas.total,
        status: Object.keys(resultado.porStatus).length,
        meses: resultado.evolucaoMensal.length
      });
      
      return resultado;
    } catch (error) {
      console.error('Erro ao gerar relatório de demandas:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace available');
      // Retornar um objeto vazio em caso de erro para evitar quebras na interface
      return {
        totalDemandas: 0,
        comDocumento: 0,
        concluidas: { total: 0, detalhes: [] },
        porStatus: {},
        evolucaoMensal: []
      };
    }
  },

  // Método para obter o tempo médio de resolução
  async getTempoMedioResolucao(empresaUid: string) {
    try {
      const { data, error } = await supabaseClient
        .rpc('calcular_tempo_medio_resolucao', {
          empresa_id: empresaUid
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao calcular tempo médio de resolução:', error);
      return null;
    }
  },
};
