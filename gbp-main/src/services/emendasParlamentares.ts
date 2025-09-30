import { supabaseClient } from '../lib/supabase';

export interface EmendaParlamentar {
  uid: string;
  empresa_uid: string;
  numero_emenda: string;
  ano: number;
  tipo: string;
  descricao?: string;
  valor_total: number;
  status: string;
  beneficiario?: string;
  beneficiario_cnpj?: string;
  beneficiario_municipio?: string;
  beneficiario_estado?: string;
  data_empenho?: string;
  data_liberacao?: string;
  data_pagamento?: string;
  valor_empenhado?: number;
  valor_pago?: number;
  observacoes?: string;
  arquivos?: Array<{
    nome: string;
    tipo: string;
    tamanho: number;
    url?: string;
  }>;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export const emendasParlamentaresService = {
  async listar(empresaUid: string): Promise<EmendaParlamentar[]> {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_emendas_parlamentares')
        .select('*')
        .eq('empresa_uid', empresaUid)
        .is('deleted_at', null)
        .order('ano', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao deletar emenda:', error);
        throw new Error('Não foi possível deletar a emenda.');
      }
      return data;
    } catch (error) {
      console.error('Erro ao listar emendas parlamentares:', error);
      throw error;
    }
  },

  async create(emenda: Omit<EmendaParlamentar, 'uid' | 'created_at' | 'updated_at'>): Promise<EmendaParlamentar> {
    const { data, error } = await supabaseClient
      .from('gbp_emendas_parlamentares')
      .insert([emenda])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar emenda:', error);
      throw new Error('Não foi possível criar a emenda.');
    }
    return data;
  },

  async updateById(uid: string, updates: Partial<EmendaParlamentar>): Promise<EmendaParlamentar> {
    const { data, error } = await supabaseClient
      .from('gbp_emendas_parlamentares')
      .update(updates)
      .eq('uid', uid)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar emenda:', error);
      throw new Error('Não foi possível atualizar a emenda.');
    }
    return data;
  },

  async getById(uid: string): Promise<EmendaParlamentar> {
    const { data, error } = await supabaseClient
      .from('gbp_emendas_parlamentares')
      .select('*')
      .eq('uid', uid)
      .single();

    if (error) {
      console.error('Erro ao buscar emenda:', error);
      throw new Error('Não foi possível encontrar a emenda.');
    }
    return data;
  },

  async deletar(uid: string, usuarioUid: string) {
    try {
      if (!usuarioUid) {
        throw new Error('Usuário não encontrado. Por favor, tente novamente.');
      }

      const { error } = await supabaseClient
        .from('gbp_emendas_parlamentares')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_by: usuarioUid
        })
        .eq('uid', uid);

      if (error) {
        console.error('Erro ao deletar emenda parlamentar:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erro ao deletar emenda parlamentar:', error);
      throw error;
    }
  },
};
