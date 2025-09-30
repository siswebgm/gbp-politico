import { supabaseClient } from '../../lib/supabase';
import { handleSupabaseError } from '../../utils/errorHandling';
import type { Attendance } from '../../types/attendance';

export async function listAttendances(
  companyId: number,
  eleitorId?: number
): Promise<Attendance[]> {
  try {
    if (!companyId) {
      throw new Error('ID da empresa é obrigatório');
    }

    let query = supabaseClient
      .from('gbp_atendimentos')
      .select(`
        *,
        eleitor:gbp_eleitores(id, nome),
        usuario:gbp_usuarios(id, nome),
        categoria:gbp_categorias_atendimento(id, nome)
      `)
      .eq('empresa_id', String(companyId))
      .order('data_atendimento', { ascending: false });

    if (eleitorId) {
      query = query.eq('eleitor_id', eleitorId);
    }

    const { data, error } = await query;

    if (error) {
      handleSupabaseError(error, 'listar atendimentos');
    }

    return (data || []).map(item => ({
      ...item,
      empresa_id: Number(item.empresa_id), // Convert back to number
    }));
  } catch (error) {
    handleSupabaseError(error, 'listar atendimentos');
  }
}