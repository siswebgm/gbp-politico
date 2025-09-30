import { supabaseClient } from '../../lib/supabase';
import { handleSupabaseError } from '../../utils/errorHandling';
import { validateAttendanceData } from './validation';
import type { Attendance } from '../../types/attendance';

export async function updateAttendance(
  id: number,
  updates: Partial<Attendance>,
  companyId: number
): Promise<Attendance> {
  try {
    // Validate attendance data
    await validateAttendanceData(updates);

    // Check if attendance exists and belongs to company
    const { data: existingAttendance, error: checkError } = await supabaseClient
      .from('gbp_atendimentos')
      .select('id')
      .eq('id', id)
      .eq('empresa_id', companyId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        throw new Error('Atendimento não encontrado ou não pertence à empresa');
      }
      throw checkError;
    }

    // Update attendance
    const { data, error } = await supabaseClient
      .from('gbp_atendimentos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    handleSupabaseError(error);
    throw error;
  }
}