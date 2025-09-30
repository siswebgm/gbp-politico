import { supabaseClient } from '../lib/supabase';
import { handleSupabaseError } from '../utils/errorHandling';

export interface Company {
  id: string;
  nome: string;
  cnpj: string;
  telefone?: string | null;
  website?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  token: string | null;
  instancia: string | null;
  porta: string | null;
  texto_aniversario: string | null;
  video_aniversario: string | null;
  imagem_aniversario: string | null;
  created_at: string;
}

export const companyService = {
  create: async (company: Omit<Company, 'id' | 'created_at'>): Promise<Company> => {
    try {
      // Gerar próximo ID
      const { data: nextId, error: idError } = await supabaseClient
        .rpc('next_id', { table_name: 'gbp_empresas' });
      
      if (idError) throw idError;

      const { data, error } = await supabaseClient
        .from('gbp_empresas')
        .insert({
          ...company,
          id: nextId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  },

  getById: async (uid: string): Promise<Company | null> => {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_empresas')
        .select('*')
        .eq('uid', uid)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      handleSupabaseError(error);
      throw error;
    }
  },

  list: async (): Promise<Company[]> => {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_empresas')
        .select('*')
        .order('nome');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      handleSupabaseError(error);
      throw error;
    }
  },

  update: async (uid: string, updates: Partial<Company>): Promise<Company> => {
    const { data, error } = await supabaseClient
      .from('gbp_empresas')
      .update(updates)
      .eq('uid', uid)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Company not found');

    return data;
  },

  delete: async (uid: string): Promise<void> => {
    const { error } = await supabaseClient
      .from('gbp_empresas')
      .delete()
      .eq('uid', uid);

    if (error) throw error;
  },
};