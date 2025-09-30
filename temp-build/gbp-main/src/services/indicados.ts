import { supabaseClient } from '../lib/supabase';
import { handleSupabaseError } from '../utils/errorHandling';
import type { Indicado } from '../types/indicado';

export const indicadoService = {
  create: async (data: Omit<Indicado, 'id' | 'created_at' | 'updated_at'>): Promise<Indicado> => {
    try {
      if (!data.gbp_empresas) {
        throw new Error('ID da empresa é obrigatório');
      }

      const { data: indicado, error } = await supabaseClient
        .from('gbp_indicado')
        .insert([{
          ...data,
          nome: data.nome.toUpperCase(),
          cidade: data.cidade?.toUpperCase(),
          bairro: data.bairro?.toUpperCase()
        }])
        .select()
        .single();

      if (error) throw error;
      if (!indicado) throw new Error('Erro ao criar indicado');

      return indicado;
    } catch (error) {
      console.error('Error creating indicado:', error);
      throw error;
    }
  },

  list: async (empresaId: number): Promise<Indicado[]> => {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_indicados')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      handleSupabaseError(error);
      throw error;
    }
  },

  findByCpf: async (cpf: string, empresaId: number): Promise<Indicado | null> => {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_indicados')
        .select('*')
        .eq('cpf', cpf)
        .eq('empresa_id', empresaId)
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

  search: async (query: string, empresaId: number): Promise<Indicado[]> => {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_indicados')
        .select('*')
        .eq('empresa_id', empresaId)
        .or(`nome.ilike.%${query}%,cpf.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      handleSupabaseError(error);
      throw error;
    }
  },
};