import { supabaseClient } from '../../lib/supabase';
import { handleSupabaseError } from '../../utils/errorHandling';
import { validateAttendanceData } from './validation';
import type { Attendance } from '../../types/attendance';

export async function createAttendance(
  attendance: Omit<Attendance, 'id' | 'created_at'>
): Promise<Attendance> {
  try {
    if (!attendance.empresa_id) {
      throw new Error('ID da empresa é obrigatório');
    }

    // Validate data
    await validateAttendanceData(attendance);

    // Create attendance
    const { data, error } = await supabaseClient
      .from('gbp_atendimentos')
      .insert([{
        eleitor_id: attendance.eleitor_id,
        usuario_id: attendance.usuario_id,
        categoria_id: attendance.categoria_id,
        descricao: attendance.descricao,
        status: attendance.status,
        data_atendimento: attendance.data_atendimento || new Date().toISOString(),
        empresa_id: attendance.empresa_id,
      }])
      .select(`
        *,
        eleitor:gbp_eleitores(id, nome),
        usuario:gbp_usuarios(id, nome),
        categoria:gbp_categorias_atendimento(id, nome)
      `)
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
    throw error;
  }
}