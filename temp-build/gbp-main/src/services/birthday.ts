import { supabaseClient } from '../lib/supabase';
import { handleSupabaseError } from '../utils/errorHandling';
import type { Birthday } from '../types/birthday';

export const birthdayService = {
  create: async (data: Omit<Birthday, 'id' | 'created_at'>): Promise<Birthday> => {
    try {
      if (!data.gbp_empresas) {
        throw new Error('ID da empresa é obrigatório');
      }

      const { data: birthday, error } = await supabaseClient
        .from('gbp_aniversarios')
        .insert([{
          texto: data.texto?.trim() || null,
          card: data.card?.trim() || null,
          video: data.video?.trim() || null,
          audio: data.audio?.trim() || null,
          gbp_empresas: data.gbp_empresas,
        }])
        .select()
        .single();

      if (error) throw error;
      if (!birthday) throw new Error('Erro ao criar configuração de aniversário');

      return birthday;
    } catch (error) {
      handleSupabaseError(error);
      throw error;
    }
  },

  get: async (empresaId: number): Promise<Birthday | null> => {
    try {
      if (!empresaId) {
        throw new Error('ID da empresa é obrigatório');
      }

      const { data, error } = await supabaseClient
        .from('gbp_aniversarios')
        .select('*')
        .eq('gbp_empresas', empresaId)
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

  update: async (id: number, data: Partial<Birthday>): Promise<Birthday> => {
    try {
      const { data: birthday, error } = await supabaseClient
        .from('gbp_aniversarios')
        .update({
          texto: data.texto?.trim() || null,
          card: data.card?.trim() || null,
          video: data.video?.trim() || null,
          audio: data.audio?.trim() || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!birthday) throw new Error('Configuração de aniversário não encontrada');

      return birthday;
    } catch (error) {
      handleSupabaseError(error);
      throw error;
    }
  },
};