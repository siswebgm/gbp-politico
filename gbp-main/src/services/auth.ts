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
  cota_criar_empresas?: number;
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
          cota_criar_empresas,
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

  async validateRecoveryContact(email: string, digits: string): Promise<void> {
    try {
      const { data: user, error } = await supabaseClient
        .from('gbp_usuarios')
        .select('uid, contato, status, tentativas_login')
        .eq('email', email)
        .single();

      if (error || !user) {
        throw new AuthError('Email não encontrado.');
      }

      if (user.status === 'blocked' || user.status === 'bloqueado') {
        throw new AuthError('conta_bloqueada');
      }

      if (user.status !== 'active') {
        throw new AuthError('conta_inativa');
      }

      const cleanDigits = digits.replace(/\D/g, '').slice(-4);
      const userContact = String(user.contato || '').replace(/\D/g, '');
      const last4 = userContact.slice(-4);

      if (last4.length !== 4) {
        throw new AuthError('Não foi possível validar o contato. Entre em contato com o administrador.');
      }

      if (last4 !== cleanDigits) {
        const currentAttempts = (user.tentativas_login || 0) + 1;
        const updates: { tentativas_login: number; status?: string } = {
          tentativas_login: currentAttempts,
        };

        if (currentAttempts >= 3) {
          updates.status = 'blocked';
        }

        await supabaseClient
          .from('gbp_usuarios')
          .update(updates)
          .eq('uid', user.uid);

        if (currentAttempts >= 3) {
          throw new AuthError('conta_bloqueada');
        }

        const remaining = 3 - currentAttempts;
        throw new AuthError(
          `Código incorreto. ${remaining} tentativa${remaining === 1 ? '' : 's'} restante${remaining === 1 ? '' : 's'} antes do bloqueio.`
        );
      }

      // Contato correto — zera tentativas
      await supabaseClient
        .from('gbp_usuarios')
        .update({ tentativas_login: 0 })
        .eq('uid', user.uid);
    } catch (error) {
      if (error instanceof AuthError) throw error;
      console.error('Erro na validação de recuperação:', error);
      throw new AuthError('Erro ao validar contato. Tente novamente.');
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