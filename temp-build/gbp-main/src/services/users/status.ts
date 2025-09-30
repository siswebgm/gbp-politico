import { supabaseClient } from '../../lib/supabase';
import { User } from '../../types/user';
import { handleSupabaseError } from '../../utils/errorHandling';

export const toggleUserStatus = async (id: string, companyUid: string): Promise<User | undefined> => {
  try {
    if (!companyUid) {
      throw new Error('Company UID is required');
    }

    const { data: user, error: fetchError } = await supabaseClient
      .from('gbp_usuarios')
      .select('status')
      .eq('id', id)
      .eq('empresa_uid', companyUid)
      .single();

    if (fetchError) {
      handleSupabaseError(fetchError, 'fetch user status');
      return undefined;
    }

    if (!user) {
      throw new Error('User not found');
    }

    const newStatus = user.status === 'active' ? 'blocked' : 'active';

    const { data, error } = await supabaseClient
      .from('gbp_usuarios')
      .update({ status: newStatus })
      .eq('id', id)
      .eq('empresa_uid', companyUid)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'toggle user status');
      return undefined;
    }

    if (!data) {
      throw new Error('Failed to update user status');
    }

    return data;
  } catch (error) {
    handleSupabaseError(error, 'toggle user status');
    return undefined;
  }
};