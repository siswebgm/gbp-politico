import { supabaseClient } from '../lib/supabase';
import { getSessaoToken } from '../lib/session';

export interface User {
  uid: string;
  nome: string | null;
  email: string | null;
  contato: string | null;
  nivel_acesso: 'admin' | 'coordenador' | 'analista' | 'colaborador' | 'visitante';
  status: 'active' | 'pending' | 'blocked' | 'bloqueado';
  ultimo_acesso: string | null;
  empresa_uid: string;
  foto: string | null;
  adm_empresa?: boolean;
  tentativas_login?: number;
}

export interface RegistrationToken {
  user_id: string;
  token: string;
  expires_at: Date;
}

const FIXED_GOAL = 1000;

// Colunas seguras de gbp_usuarios (nunca incluir senha/senha_hash —
// essas colunas não são mais legíveis pela anon key)
const SAFE_USER_COLUMNS =
  'uid, nome, email, contato, nivel_acesso, cargo, status, tentativas_login, empresa_uid, ultimo_acesso, created_at, foto, adm_empresa, permissoes, cota_criar_empresas, notification_status, notification_updated_at';

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

      // Criação via RPC com sessão de admin (INSERT direto foi revogado)
      const { data, error } = await supabaseClient.rpc('admin_criar_usuario', {
        p_sessao_token: getSessaoToken(),
        p_dados: userDataToSend,
      });

      if (error) {
        console.error('Erro ao criar usuário:', error);
        throw new Error(error.message || 'Erro ao criar usuário no banco de dados');
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
          tentativas_login,
          foto,
          adm_empresa
        `)
        .eq('empresa_uid', empresa_uid)
        .eq('adm_empresa', false)
        .order('ultimo_acesso', { ascending: false, nullsFirst: false });

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
      // Edição via RPC com sessão de admin (UPDATE direto foi revogado)
      const { data, error } = await supabaseClient.rpc('admin_atualizar_usuario', {
        p_sessao_token: getSessaoToken(),
        p_user_uid: id,
        p_dados: userData,
      });

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
        .select('uid');

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
      // Exclusão via RPC com sessão de admin (DELETE direto foi revogado)
      const { error } = await supabaseClient.rpc('admin_excluir_usuario', {
        p_sessao_token: getSessaoToken(),
        p_user_uid: id,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error in delete:', error);
      return false;
    }
  },

  async completeRegistration(userId: string, password: string) {
    try {
      // Senha definida no servidor (bcrypt) — a coluna senha não é
      // mais gravável diretamente pela anon key
      const { error } = await supabaseClient.rpc('definir_senha_por_id', {
        p_user_id: Number(userId),
        p_nova_senha: password,
      });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error in completeRegistration:', error);
      return false;
    }
  }
};