import { supabaseClient } from '../lib/supabase';
import { toast } from 'sonner';

export interface PesquisaEleitoral {
  uid: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  ativa: boolean;
  tipo_pesquisa: string;
  empresa_uid: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CriarPesquisaEleitoralDTO {
  titulo: string;
  descricao?: string;
  data_inicio: string;
  data_fim?: string | null;
  ativa?: boolean;
  tipo_pesquisa: string;
  empresa_uid: string;
  created_by?: string | null;
}

export interface AtualizarPesquisaEleitoralDTO {
  titulo?: string;
  descricao?: string | null;
  data_inicio?: string;
  data_fim?: string | null;
  ativa?: boolean;
  tipo_pesquisa?: string;
}

export const pesquisaEleitoralService = {
  // Listar todas as pesquisas
  async listar(empresa_uid: string): Promise<PesquisaEleitoral[]> {
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
  },

  // Obter uma pesquisa específica
  async obter(uid: string): Promise<PesquisaEleitoral | null> {
    try {
      const { data, error } = await supabaseClient
        .from('ps_gbp_pesquisas')
        .select('*')
        .eq('uid', uid)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao obter pesquisa:', error);
      toast.error('Erro ao carregar a pesquisa');
      return null;
    }
  },

  // Criar uma nova pesquisa
  async criar(dados: CriarPesquisaEleitoralDTO): Promise<PesquisaEleitoral | null> {
    try {
      const { data, error } = await supabaseClient
        .from('ps_gbp_pesquisas')
        .insert([{
          ...dados,
          ativa: dados.ativa ?? true,
          created_by: dados.created_by || null,
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
  },

  // Atualizar uma pesquisa existente
  async atualizar(
    uid: string, 
    dados: AtualizarPesquisaEleitoralDTO
  ): Promise<PesquisaEleitoral | null> {
    try {
      const { data, error } = await supabaseClient
        .from('ps_gbp_pesquisas')
        .update({
          ...dados,
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
  },

  // Excluir uma pesquisa
  async excluir(uid: string): Promise<boolean> {
    try {
      // Ordem de exclusão para respeitar as restrições de chave estrangeira
      const operacoesExclusao = [
        { tabela: 'ps_gbp_respostas', campo: 'pesquisa_uid' },
        { tabela: 'ps_gbp_opcoes_enquete', campo: 'pergunta_uid' },
        { tabela: 'ps_gbp_perguntas', campo: 'pesquisa_uid' },
        { tabela: 'ps_gbp_participantes', campo: 'pesquisa_uid' },
        { tabela: 'ps_gbp_candidatos', campo: 'pesquisa_uid' }
      ];

      // Excluir registros de cada tabela dependente
      for (const { tabela, campo } of operacoesExclusao) {
        try {
          // Primeiro tenta encontrar se a tabela tem registros
          const { data: registros, error: erroBusca } = await supabaseClient
            .from(tabela)
            .select('*')
            .eq(campo, uid)
            .limit(1);

          // Se não encontrou registros, pula para a próxima tabela
          if (erroBusca || !registros || registros.length === 0) {
            continue;
          }

          // Se encontrou registros, tenta excluir
          const { error: errorExclusao } = await supabaseClient
            .from(tabela)
            .delete()
            .eq(campo, uid);

          if (errorExclusao) {
            console.warn(`Aviso ao excluir da tabela ${tabela}:`, errorExclusao);
          }
        } catch (erro) {
          console.warn(`Erro ao processar tabela ${tabela}:`, erro);
          // Continua para a próxima tabela mesmo em caso de erro
          continue;
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
  },

  // Alternar status ativo/inativo
  async toggleStatus(uid: string, ativa: boolean): Promise<boolean> {
    try {
      const { error } = await supabaseClient
        .from('ps_gbp_pesquisas')
        .update({ 
          ativa,
          updated_at: new Date().toISOString(),
        })
        .eq('uid', uid);

      if (error) throw error;
      toast.success(`Pesquisa ${ativa ? 'ativada' : 'desativada'} com sucesso!`);
      return true;
    } catch (error) {
      console.error('Erro ao alterar status da pesquisa:', error);
      toast.error(`Erro ao ${ativa ? 'ativar' : 'desativar'} a pesquisa`);
      return false;
    }
  },
};
