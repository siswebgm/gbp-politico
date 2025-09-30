import { supabaseClient } from '../lib/supabase';

export interface Empresa {
  uid: string;
  nome: string;
  logo_url?: string;
  storage?: string;
  link_demanda_disponivel?: boolean;
  // Adicione outros campos da empresa conforme necessário
}

export async function getEmpresa(uid: string): Promise<Empresa | null> {
  try {
    const { data, error } = await supabaseClient
      .from('gbp_empresas')
      .select('*')
      .eq('uid', uid)
      .single();

    if (error) throw error;
    return data as Empresa;
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    return null;
  }
}
