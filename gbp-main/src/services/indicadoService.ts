import { supabaseClient } from '../lib/supabase';

export interface Indicado {
  uid: string;
  nome: string;
  cidade?: string;
  bairro?: string;
  whatsapp?: string;
  empresa_uid: string;
  created_at?: string;
}

export const indicadoService = {
  /**
   * Busca todos os indicados de uma empresa
   */
  async listByEmpresa(empresa_uid: string): Promise<Indicado[]> {
    const { data, error } = await supabaseClient
      .from('gbp_indicado')
      .select('*')
      .eq('empresa_uid', empresa_uid)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar indicados:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Busca um indicado pelo UID
   */
  async getByUid(uid: string): Promise<Indicado | null> {
    const { data, error } = await supabaseClient
      .from('gbp_indicado')
      .select('*')
      .eq('uid', uid)
      .single();

    if (error) {
      console.error('Erro ao buscar indicado:', error);
      throw error;
    }

    return data;
  },
};
