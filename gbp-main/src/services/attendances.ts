import { supabaseClient } from '../lib/supabase';
import { handleSupabaseError } from '../utils/errorHandling';
import type { Attendance } from '../types/attendance';

export interface Attendance {
  id: number;
  eleitor_id: number;
  usuario_id: number;
  categoria_id: number | null;
  descricao: string;
  status: string;
  data_atendimento: string;
  empresa_id: number;
  created_at?: string;
}

export const attendanceService = {
  create: async (attendance: Omit<Attendance, 'id' | 'created_at'>): Promise<Attendance> => {
    try {
      if (!attendance.empresa_id) {
        throw new Error('ID da empresa é obrigatório');
      }

      // Validate categoria_id if provided
      if (attendance.categoria_id) {
        const { data: categoryExists, error: categoryError } = await supabaseClient
          .from('gbp_categorias_atendimento')
          .select('id')
          .eq('id', attendance.categoria_id)
          .eq('empresa_id', attendance.empresa_id)
          .single();

        if (categoryError || !categoryExists) {
          throw new Error('Categoria de atendimento inválida');
        }
      }

      // Validate eleitor_id
      const { data: voterExists, error: voterError } = await supabaseClient
        .from('gbp_eleitores')
        .select('id')
        .eq('id', attendance.eleitor_id)
        .eq('empresa_id', attendance.empresa_id)
        .single();

      if (voterError || !voterExists) {
        throw new Error('Eleitor não encontrado');
      }

      // Create attendance
      const { data, error } = await supabaseClient
        .from('gbp_atendimentos')
        .insert([{
          ...attendance,
          status: attendance.status || 'pendente',
          data_atendimento: attendance.data_atendimento || new Date().toISOString(),
        }])
        .select('*, eleitor:gbp_eleitores(nome), usuario:gbp_usuarios(nome), categoria:gbp_categorias_atendimento(nome)')
        .single();

      if (error) {
        handleSupabaseError(error, 'criar atendimento');
      }

      if (!data) {
        throw new Error('Erro ao criar atendimento');
      }

      return data;
    } catch (error) {
      handleSupabaseError(error, 'criar atendimento');
    }
  },

  list: async (companyId: number, eleitorId?: number): Promise<Attendance[]> => {
    try {
      let query = supabaseClient
        .from('gbp_atendimentos')
        .select(`
          *,
          eleitor:gbp_eleitores(id, nome),
          usuario:gbp_usuarios(id, nome),
          categoria:gbp_categorias_atendimento(id, nome)
        `)
        .eq('empresa_id', companyId)
        .order('created_at', { ascending: false });

      if (eleitorId) {
        query = query.eq('eleitor_id', eleitorId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      handleSupabaseError(error);
      throw error;
    }
  },

  update: async (id: number, updates: Partial<Attendance>): Promise<Attendance> => {
    try {
      if (!updates.empresa_id) {
        throw new Error('ID da empresa é obrigatório');
      }

      const { data, error } = await supabaseClient
        .from('gbp_atendimentos')
        .update(updates)
        .eq('id', id)
        .eq('empresa_id', updates.empresa_id)
        .select('*, eleitor:gbp_eleitores(nome), usuario:gbp_usuarios(nome), categoria:gbp_categorias_atendimento(nome)')
        .single();

      if (error) {
        handleSupabaseError(error, 'atualizar atendimento');
      }

      if (!data) {
        throw new Error('Atendimento não encontrado');
      }

      return data;
    } catch (error) {
      handleSupabaseError(error, 'atualizar atendimento');
    }
  },

  delete: async (id: number, companyUid: string): Promise<void> => {
    try {
      if (!companyUid) {
        throw new Error('UID da empresa é obrigatório');
      }

      const { error } = await supabaseClient
        .from('gbp_atendimentos')
        .delete()
        .eq('id', id)
        .eq('empresa_uid', companyUid);

      if (error) {
        handleSupabaseError(error, 'excluir atendimento');
      }
    } catch (error) {
      handleSupabaseError(error, 'excluir atendimento');
    }
  },
};