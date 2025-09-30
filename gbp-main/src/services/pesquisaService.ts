import { supabaseClient } from '../lib/supabase';
import { toast } from 'sonner';

export interface CandidatoPesquisa {
  uid?: string;
  nome: string;
  partido?: string;
  imagem_url?: string;
  ordem?: number;
}

export interface OpcaoEnquete {
  uid?: string;
  texto: string;
  ordem?: number;
}

export interface PerguntaPesquisa {
  uid?: string;
  texto: string;
  tipo: 'estrelas' | 'nota' | 'votacao' | 'enquete';
  multiplaEscolha?: boolean;
  multipla_escolha?: boolean; // Campo para compatibilidade com o banco de dados
  permiteComentario?: boolean;
  permite_comentario?: boolean; // Campo para compatibilidade com o banco de dados
  opcoes?: OpcaoEnquete[];
  opcoes_enquete?: OpcaoEnquete[] | string; // Campo para armazenar as opções da enquete
  ordem?: number;
}

export interface CampoParticipante {
  ativo: boolean;
  obrigatorio: boolean;
}

export interface DadosParticipantePesquisa {
  nome: CampoParticipante;
  faixaEtaria: CampoParticipante;
  telefone: CampoParticipante;
  cep: CampoParticipante;
  cidade: CampoParticipante;
  bairro: CampoParticipante;
  numero: CampoParticipante;
  complemento: CampoParticipante;
  // Configurações de notificação por WhatsApp
  notificacaoWhatsApp: {
    ativo: boolean;
    mensagem: string;
  };
}

export interface Pesquisa {
  uid?: string;
  titulo: string;
  descricao?: string | null;
  tipo_pesquisa: string;
  data_inicio: string;
  data_fim?: string | null;
  ativa: boolean;
  empresa_uid: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  dados_participante?: DadosParticipantePesquisa;
  candidatos?: CandidatoPesquisa[];
  perguntas?: PerguntaPesquisa[];
}

export const listarPesquisas = async (empresa_uid: string): Promise<Pesquisa[]> => {
  try {
    const { data, error } = await supabaseClient
      .from('ps_gbp_pesquisas')
      .select('*')
      .eq('empresa_uid', empresa_uid)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao listar pesquisas:', error);
    toast.error('Erro ao carregar as pesquisas');
    return [];
  }
};

// Tipos auxiliares para as consultas
interface CandidatoJoin {
  candidato_uid: string;
  votos_iniciais: number;
  ps_gbp_candidatos: {
    uid: string;
    nome: string;
    partido: string | null;
    foto_url: string | null;
  };
}

// Usando a interface OpcaoEnquete já exportada anteriormente

interface PerguntaJoin {
  uid: string;
  pergunta: string;
  tipo_resposta: string;
  multipla_escolha: boolean;
  permite_comentario: boolean;
  opcoes: OpcaoEnquete[] | null;
  opcoes_enquete?: OpcaoEnquete[] | string | null;
  ordem: number;
}

export const obterPesquisa = async (uid: string): Promise<Pesquisa | null> => {
  try {
    // Primeiro, obtém os dados básicos da pesquisa
    const { data: pesquisa, error: pesquisaError } = await supabaseClient
      .from('ps_gbp_pesquisas')
      .select('*')
      .eq('uid', uid)
      .single();

    if (pesquisaError) throw pesquisaError;
    if (!pesquisa) return null;

    // Processa os dados do participante
    let dadosParticipante: DadosParticipantePesquisa = {
      nome: { ativo: true, obrigatorio: true },
      faixaEtaria: { ativo: false, obrigatorio: false },
      telefone: { ativo: false, obrigatorio: false },
      cep: { ativo: false, obrigatorio: false },
      cidade: { ativo: false, obrigatorio: false },
      bairro: { ativo: false, obrigatorio: false },
      numero: { ativo: false, obrigatorio: false },
      complemento: { ativo: false, obrigatorio: false },
      notificacaoWhatsApp: {
        ativo: false,
        mensagem: 'Obrigado por participar da nossa pesquisa!'
      }
    };

    // Se existirem dados do participante, mescla com os padrões
    if (pesquisa.dados_participante) {
      const dados = typeof pesquisa.dados_participante === 'string' 
        ? JSON.parse(pesquisa.dados_participante) 
        : pesquisa.dados_participante;
      
      dadosParticipante = {
        ...dadosParticipante,
        ...dados,
        // Garante que o nome sempre esteja ativo e obrigatório
        nome: {
          ativo: true,
          obrigatorio: true,
          ...dados.nome
        }
      };
    }

    // Processa a notificação do WhatsApp
    let notificacaoWhatsApp = {
      ativo: false,
      mensagem: 'Obrigado por participar da nossa pesquisa!'
    };

    if (pesquisa.notificacao_whatsapp) {
      const notificacao = typeof pesquisa.notificacao_whatsapp === 'string'
        ? JSON.parse(pesquisa.notificacao_whatsapp)
        : pesquisa.notificacao_whatsapp;
      
      notificacaoWhatsApp = {
        ...notificacaoWhatsApp,
        ...notificacao
      };
    }

    // Inicializa os dados da pesquisa
    const pesquisaCompleta: Pesquisa = {
      ...pesquisa,
      dados_participante: dadosParticipante,
      notificacao_whatsapp: notificacaoWhatsApp,
      candidatos: [],
      perguntas: []
    };

    // Obtém os candidatos associados à pesquisa
    const { data: candidatos, error: candidatosError } = await supabaseClient
      .from('ps_gbp_pesquisa_candidatos')
      .select(`
        candidato_uid,
        votos_iniciais,
        ps_gbp_candidatos:candidato_uid (
          uid,
          nome,
          partido,
          foto_url
        )
      `)
      .eq('pesquisa_uid', uid);

    if (!candidatosError && candidatos && Array.isArray(candidatos)) {
      pesquisaCompleta.candidatos = (candidatos as unknown as CandidatoJoin[])
        .filter(c => c && c.ps_gbp_candidatos) // Garante que o candidato e seus dados existam
        .map(c => ({
          uid: c.candidato_uid || `cand-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          nome: c.ps_gbp_candidatos?.nome?.trim() || 'Candidato sem nome',
          partido: c.ps_gbp_candidatos?.partido?.trim() || undefined,
          imagem_url: c.ps_gbp_candidatos?.foto_url || undefined,
          votos_iniciais: c.votos_iniciais || 0
        }));
    } else {
      pesquisaCompleta.candidatos = [];
    }

    // Obtém as perguntas associadas à pesquisa
    const { data: perguntas, error: perguntasError } = await supabaseClient
      .from('ps_gbp_perguntas')
      .select('*')
      .eq('pesquisa_uid', uid)
      .order('ordem', { ascending: true });

    if (!perguntasError && Array.isArray(perguntas)) {
      pesquisaCompleta.perguntas = (perguntas as PerguntaJoin[])
        .filter(p => p && p.uid && p.pergunta) // Filtra perguntas inválidas
        .map(p => {
        // Converte as opções de JSONB para array de opções
        let opcoes: OpcaoEnquete[] = [];
        
        // Tenta obter as opções do campo opcoes
        try {
          if (p.opcoes) {
            const opcoesRaw = typeof p.opcoes === 'string' ? JSON.parse(p.opcoes) : p.opcoes;
            if (Array.isArray(opcoesRaw)) {
              opcoes = opcoesRaw;
            } else if (typeof opcoesRaw === 'object') {
              opcoes = Object.values(opcoesRaw);
            }
          }
        } catch (error) {
          console.error('Erro ao processar opções da pergunta:', error);
        }

        // Se não houver opções no campo opcoes, tenta obter do campo opcoes_enquete
        if (opcoes.length === 0 && p.opcoes_enquete) {
          try {
            const opcoesEnquete = typeof p.opcoes_enquete === 'string' 
              ? JSON.parse(p.opcoes_enquete) 
              : p.opcoes_enquete;
            
            if (Array.isArray(opcoesEnquete)) {
              opcoes = opcoesEnquete.map((op: any, index: number) => ({
                uid: op.uid || `opc-${Date.now()}-${index}`,
                texto: op.texto || op.descricao || `Opção ${index + 1}`,
                ordem: op.ordem || index
              }));
            }
          } catch (error) {
            console.error('Erro ao processar opcoes_enquete:', error);
          }
        }

        return {
          uid: p.uid,
          texto: p.pergunta,
          tipo: (p.tipo_resposta === 'enquete' ? 'votacao' : p.tipo_resposta as 'estrelas' | 'nota' | 'votacao') || 'estrelas',
          multiplaEscolha: p.multipla_escolha || false,
          permiteComentario: p.permite_comentario || false,
          opcoes: opcoes.sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
        };
      });
    }

    return pesquisaCompleta;
  } catch (error) {
    console.error('Erro ao obter pesquisa:', error);
    toast.error('Erro ao carregar a pesquisa');
    return null;
  }
};

export const criarPesquisa = async (pesquisa: Omit<Pesquisa, 'uid'>): Promise<Pesquisa | null> => {
  try {
    const { data, error } = await supabaseClient
      .from('ps_gbp_pesquisas')
      .insert([{
        ...pesquisa,
        ativa: pesquisa.ativa ?? true,
        created_by: pesquisa.created_by || null,
      }])
      .select()
      .single();

    if (error) throw error;
    toast.success('Pesquisa criada com sucesso!');
    return data;
  } catch (error) {
    console.error('Erro ao criar pesquisa:', error);
    toast.error('Erro ao criar a pesquisa');
    return null;
  }
};

export const atualizarPesquisa = async (uid: string, pesquisa: Partial<Pesquisa>): Promise<Pesquisa | null> => {
  try {
    const { data, error } = await supabaseClient
      .from('ps_gbp_pesquisas')
      .update({
        ...pesquisa,
        updated_at: new Date().toISOString(),
      })
      .eq('uid', uid)
      .select()
      .single();

    if (error) throw error;
    toast.success('Pesquisa atualizada com sucesso!');
    return data;
  } catch (error) {
    console.error('Erro ao atualizar pesquisa:', error);
    toast.error('Erro ao atualizar a pesquisa');
    return null;
  }
};

export const excluirPesquisa = async (uid: string): Promise<boolean> => {
  try {
    // Primeiro, excluir todas as dependências
    const tabelasDependentes = [
      'ps_gbp_candidatos',
      'ps_gbp_perguntas',
      'ps_gbp_respostas',
      'ps_gbp_participantes',
      'ps_gbp_opcoes_enquete'
    ];

    // Excluir registros de cada tabela dependente
    for (const tabela of tabelasDependentes) {
      const { error: errorDependente } = await supabaseClient
        .from(tabela)
        .delete()
        .eq('pesquisa_uid', uid);

      if (errorDependente && errorDependente.code !== '42P01') { // Ignora erro de tabela não encontrada
        console.error(`Erro ao excluir da tabela ${tabela}:`, errorDependente);
      }
    }

    // Depois, excluir a pesquisa
    const { error } = await supabaseClient
      .from('ps_gbp_pesquisas')
      .delete()
      .eq('uid', uid);

    if (error) throw error;
    
    toast.success('Pesquisa e todos os dados associados foram excluídos com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao excluir pesquisa:', error);
    toast.error('Erro ao excluir a pesquisa. Verifique se não há mais dependências.');
    return false;
  }
};
