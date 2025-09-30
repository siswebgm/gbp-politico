import { supabaseClient } from '../../lib/supabase';
import { handleSupabaseError } from '../../utils/errorHandling';

export async function deleteAttendance(id: number, companyId: number): Promise<void> {
  try {
    if (!companyId) {
      throw new Error('ID da empresa é obrigatório');
    }

    const { error } = await supabaseClient
      .from('gbp_atendimentos')
      .delete()
      .eq('id', id)
      .eq('empresa_id', String(companyId));

    if (error) {
      handleSupabaseError(error, 'excluir atendimento');
    }
  } catch (error) {
    handleSupabaseError(error, 'excluir atendimento');
  }
}