import { supabaseClient } from '../lib/supabase';

export interface CategoryType {
  uid: string;
  nome: string;
  empresa_uid: string;
  created_at: string;
}

export const categoryTypesService = {
  list: async (companyUid: string): Promise<CategoryType[]> => {
    const { data, error } = await supabaseClient
      .from('gbp_categoria_tipos')
      .select('*')
      .eq('empresa_uid', companyUid)
      .order('nome');

    if (error) throw error;
    return data || [];
  },

  create: async (nome: string, empresa_uid: string): Promise<CategoryType> => {
    if (!nome?.trim()) {
      throw new Error('Nome é obrigatório');
    }

    // Garante que o nome do tipo seja sempre em maiúsculas
    const nomeFormatado = nome.trim().toUpperCase();

    const { data, error } = await supabaseClient
      .from('gbp_categoria_tipos')
      .insert([{
        nome: nomeFormatado,
        empresa_uid
      }])
      .select('uid, nome, empresa_uid, created_at')
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (uid: string): Promise<void> => {
    const { error } = await supabaseClient
      .from('gbp_categoria_tipos')
      .delete()
      .eq('uid', uid);

    if (error) throw error;
  }
};
