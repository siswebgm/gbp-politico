import { supabaseClient } from '../lib/supabase';

export interface User {
  uid: string;
  nome: string | null;
  email: string | null;
  contato: string | null;
  nivel_acesso: 'admin' | 'coordenador' | 'analista' | 'colaborador' | 'visitante';
  status: 'active' | 'pending' | 'blocked';
  ultimo_acesso: string | null;
  empresa_uid: string;
  foto: string | null;
  adm_empresa?: boolean;
}

export interface RegistrationToken {
  user_id: string;
  token: string;
  expires_at: Date;
}

const FIXED_GOAL = 1000;

export const userService = {
  async getNextId() {
    const { data, error } = await supabaseClient
      .rpc('next_id', { table_name: 'gbp_usuarios' });
    
    if (error) throw error;
    return data;
  },

  async create(userData: Partial<User>) {
    try {
      console.log('Criando usuário:', userData);

      // Validações básicas
      if (!userData.email || !userData.nome || !userData.nivel_acesso) {
        throw new Error('Campos obrigatórios não preenchidos');
      }

      // Remove a confirmação de senha antes de enviar
      const { confirmarSenha, ...userDataToSend } = userData as any;
      
      // Verifica se o email já existe
      const { data: existingUser } = await supabaseClient
        .from('gbp_usuarios')
        .select('email')
        .eq('email', userData.email)
        .single();

      if (existingUser) {
        throw new Error('Este email já está cadastrado');
      }
      
      const { data, error } = await supabaseClient
        .from('gbp_usuarios')
        .insert([{
          ...userDataToSend,
          created_at: new Date().toISOString(),
          status: 'active',
          notification_status: 'enabled',
          notification_updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar usuário:', error);
        if (error.code === '23505') {
          throw new Error('Este email já está cadastrado');
        }
        throw new Error('Erro ao criar usuário no banco de dados');
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  },

  async list(empresa_uid: string) {
    try {
      console.log('Listando usuários para empresa:', empresa_uid);
      const { data, error } = await supabaseClient
        .from('gbp_usuarios')
        .select(`
          uid,
          nome,
          email,
          contato,
          nivel_acesso,
          empresa_uid,
          ultimo_acesso,
          created_at,
          status,
          foto,
          adm_empresa
        `)
        .eq('empresa_uid', empresa_uid)
        .order('nome');

      if (error) {
        console.error('Erro na consulta:', error);
        throw error;
      }

      console.log('Dados retornados:', data);
      return data || [];
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      throw error;
    }
  },

  async update(id: string, userData: Partial<Omit<User, 'uid' | 'empresa_uid'>>) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_usuarios')
        .update(userData)
        .eq('uid', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  },

  async updateLastAccess(userId: string) {
    try {
      console.log('Iniciando atualização de último acesso para usuário:', userId);
      
      const { data: user, error: userError } = await supabaseClient
        .from('gbp_usuarios')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error('Usuário não encontrado:', userError);
        return false;
      }

      console.log('Usuário encontrado, atualizando último acesso...');

      const now = new Date();
      const timestamptz = now.toISOString();
      
      const { data, error } = await supabaseClient
        .from('gbp_usuarios')
        .update({ 
          ultimo_acesso: timestamptz
        })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('Erro ao atualizar último acesso:', error);
        return false;
      }

      console.log('Último acesso atualizado com sucesso. Dados:', data);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar último acesso:', error);
      return false;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabaseClient
        .from('gbp_usuarios')
        .delete()
        .eq('uid', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error in delete:', error);
      return false;
    }
  },

  async completeRegistration(userId: string, password: string) {
    try {
      const { error: updateError } = await supabaseClient
        .from('gbp_usuarios')
        .update({
          senha: password,
          status: 'active'
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      return true;
    } catch (error) {
      console.error('Error in completeRegistration:', error);
      return false;
    }
  }
};