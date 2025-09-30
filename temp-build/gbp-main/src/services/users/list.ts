import { supabaseClient } from '../../lib/supabase';
import { handleSupabaseError } from '../../utils/errorHandling';
import type { User, UserFilters } from '../../types/user';

export const listUsers = async (companyUid: string, filters?: UserFilters): Promise<User[]> => {
  try {
    if (!companyUid) {
      throw new Error('Company UID is required');
    }

    let query = supabaseClient
      .from('gbp_usuarios')
      .select('*')
      .eq('empresa_uid', companyUid)
      .order('created_at', { ascending: false });

    if (filters?.search) {
      query = query.or(`nome.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    if (filters?.role) {
      query = query.eq('nivel_acesso', filters.role);
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
};