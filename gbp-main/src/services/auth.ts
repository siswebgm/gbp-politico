import { supabaseClient } from '../lib/supabase';

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export const CargoEnum = {
  ADMIN: 'admin' as const,
  EDITOR: 'editor' as const,
  VIEWER: 'viewer' as const
} as const;

export type CargoType = typeof CargoEnum[keyof typeof CargoEnum];

export interface AuthData {
  id: number;
  uid: string;
  nome: string | null;
  email: string;
  cargo: CargoType | null;
  nivel_acesso: string | null;
  permissoes: string[];
  empresa_uid: string | null;
  contato: string | null;
  status: string | null;
  ultimo_acesso: string | null;
  created_at: string | null;
  foto: string | null;
  notification_token: string | null;
  notification_status: string | null;
  notification_updated_at: string | null;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthData> {
    try {
      // Busca o usuário na tabela gbp_usuarios pelo email e senha
      const { data: user, error } = await supabaseClient
        .from('gbp_usuarios')
        .select(`
          id,
          uid,
          nome,
          email,
          cargo,
          nivel_acesso,
          permissoes,
          empresa_uid,
          contato,
          status,
          ultimo_acesso,
          created_at,
          foto,
          notification_token,
          notification_status,
          notification_updated_at
        `)
        .eq('email', email)
        .eq('senha', password)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        if (error.code === 'PGRST116') {
          throw new AuthError('Email ou senha incorretos');
        }
        throw new AuthError('Erro ao buscar usuário');
      }

      if (!user) {
        console.error('User not found');
        throw new AuthError('Email ou senha incorretos');
      }

      // Atualiza o último acesso
      const { error: updateError } = await supabaseClient
        .from('gbp_usuarios')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('uid', user.uid);

      if (updateError) {
        console.error('Error updating last access:', updateError);
      }

      // Armazena os dados do usuário no localStorage
      localStorage.setItem('gbp_user', JSON.stringify(user));
      localStorage.setItem('empresa_uid', user.empresa_uid || '');
      localStorage.setItem('user_uid', user.uid);

      return user as AuthData;
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Erro ao fazer login. Por favor, verifique suas credenciais.');
    }
  },

  async updateLastAccess(userId: string): Promise<void> {
    try {
      const { error } = await supabaseClient
        .from('gbp_usuarios')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('uid', userId);

      if (error) {
        console.error('Error updating last access:', error);
      }
    } catch (error) {
      console.error('Error in updateLastAccess:', error);
    }
  }
};