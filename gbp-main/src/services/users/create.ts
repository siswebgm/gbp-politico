import { supabaseClient } from '../../lib/supabase';
import { User } from '../../types/user';
import { handleSupabaseError } from '../../utils/errorHandling';
import { validateUserData } from '../../utils/validation';

export const createUser = async (
  user: Omit<User, 'id' | 'created_at' | 'ultimo_acesso'>
): Promise<User> => {
  try {
    validateUserData(user);

    const { data, error } = await supabaseClient
      .from('gbp_usuarios')
      .insert([{
        ...user,
        nome: user.nome.toUpperCase(),
        email: user.email.toLowerCase(),
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Email already registered');
      }
      handleSupabaseError(error, 'create user');
    }

    if (!data) {
      throw new Error('Failed to create user');
    }

    return data;
  } catch (error) {
    handleSupabaseError(error, 'create user');
  }
};