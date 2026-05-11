import { supabaseClient } from '../lib/supabase';

export interface UserValidationResult {
  isValid: boolean;
  reason?: 'user_not_found' | 'user_inactive' | 'company_not_found' | 'company_inactive' | 'network_error';
  user?: {
    uid: string;
    status: string;
    empresa_uid: string;
    nivel_acesso: string;
  };
  company?: {
    uid: string;
    status: string;
  };
}

/**
 * Valida se o usuário existe e está ativo no banco de dados
 * Também verifica se a empresa associada existe e está ativa
 */
export async function validateUserSession(userUid: string): Promise<UserValidationResult> {
  try {
    // Busca o usuário no banco
    const { data: userData, error: userError } = await supabaseClient
      .from('gbp_usuarios')
      .select('uid, status, empresa_uid, nivel_acesso')
      .eq('uid', userUid)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116' || userError.message?.includes('not found')) {
        console.error('[AuthValidation] Usuário não encontrado:', userUid);
        return { isValid: false, reason: 'user_not_found' };
      }
      console.error('[AuthValidation] Erro ao buscar usuário:', userError);
      return { isValid: false, reason: 'network_error' };
    }

    if (!userData) {
      console.error('[AuthValidation] Usuário retornou null:', userUid);
      return { isValid: false, reason: 'user_not_found' };
    }

    // Verifica se o usuário está ativo
    if (userData.status !== 'active') {
      console.error('[AuthValidation] Usuário inativo:', userUid, 'Status:', userData.status);
      return { 
        isValid: false, 
        reason: 'user_inactive',
        user: userData
      };
    }

    // Se tem empresa associada, verifica se ela existe e está ativa
    if (userData.empresa_uid) {
      const { data: companyData, error: companyError } = await supabaseClient
        .from('gbp_empresas')
        .select('uid, status')
        .eq('uid', userData.empresa_uid)
        .single();

      if (companyError || !companyData) {
        console.error('[AuthValidation] Empresa não encontrada:', userData.empresa_uid);
        return { 
          isValid: false, 
          reason: 'company_not_found',
          user: userData
        };
      }

      if (companyData.status !== 'active') {
        console.error('[AuthValidation] Empresa inativa:', userData.empresa_uid);
        return { 
          isValid: false, 
          reason: 'company_inactive',
          user: userData,
          company: companyData
        };
      }

      return { 
        isValid: true, 
        user: userData,
        company: companyData
      };
    }

    return { 
      isValid: true, 
      user: userData
    };

  } catch (error) {
    console.error('[AuthValidation] Erro inesperado:', error);
    return { isValid: false, reason: 'network_error' };
  }
}

/**
 * Verifica rapidamente se o usuário existe (para usar em verificações periódicas)
 */
export async function checkUserExists(userUid: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseClient
      .from('gbp_usuarios')
      .select('uid')
      .eq('uid', userUid)
      .eq('status', 'active')
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}
