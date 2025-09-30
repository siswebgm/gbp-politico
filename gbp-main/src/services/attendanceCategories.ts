import { supabaseClient } from '../lib/supabase';
import { handleSupabaseError } from '../utils/errorHandling';

export interface AttendanceCategory {
  id: number;
  nome: string;
  descricao: string | null;
  empresa_uid: string;
  created_at: string;
}

export const attendanceCategoryService = {
  create: async (category: Omit<AttendanceCategory, 'id' | 'created_at'>): Promise<AttendanceCategory> => {
    try {
      if (!category.empresa_uid) {
        throw new Error('Company UID is required');
      }

      const { data, error } = await supabaseClient
        .from('gbp_categorias_atendimento')
        .insert([{
          ...category,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) handleSupabaseError(error, 'create attendance category');
      if (!data) throw new Error('No data returned from Supabase');

      return data;
    } catch (error) {
      handleSupabaseError(error, 'create attendance category');
    }
  },

  list: async (companyUid: string): Promise<AttendanceCategory[]> => {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_categorias_atendimento')
        .select('*')
        .eq('empresa_uid', companyUid)
        .order('nome');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'list attendance categories');
      return [];
    }
  },

  delete: async (id: number, companyUid: string): Promise<void> => {
    try {
      if (!companyUid) {
        throw new Error('Company UID is required');
      }

      const { error } = await supabaseClient
        .from('gbp_categorias_atendimento')
        .delete()
        .eq('id', id)
        .eq('empresa_uid', companyUid);

      if (error) handleSupabaseError(error, 'delete attendance category');
    } catch (error) {
      handleSupabaseError(error, 'delete attendance category');
    }
  },
};