import { supabaseClient } from '../../lib/supabase';
import { handleSupabaseError } from '../../utils/errorHandling';

export const deleteUser = async (id: string, companyUid: string): Promise<void> => {
  try {
    if (!companyUid) {
      throw new Error('Company UID is required');
    }

    const { error } = await supabaseClient
      .from('gbp_usuarios')
      .delete()
      .eq('id', id)
      .eq('empresa_uid', companyUid);

    if (error) {
      handleSupabaseError(error, 'delete user');
    }
  } catch (error) {
    handleSupabaseError(error, 'delete user');
  }
};