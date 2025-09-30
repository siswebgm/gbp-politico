import { supabaseClient } from '../../lib/supabase';
import { handleSupabaseError } from '../../utils/errorHandling';
import type { Document } from '../../types/document';

export async function listDocuments(companyId: number): Promise<Document[]> {
  try {
    if (!companyId) {
      throw new Error('ID da empresa é obrigatório');
    }

    const { data, error } = await supabaseClient
      .from('gbp_documentos')
      .select(`
        *,
        aprovacoes:gbp_documentos_aprovacoes(
          id,
          usuario_id,
          status,
          comentario,
          created_at,
          usuario:gbp_usuarios(
            id,
            nome,
            email
          )
        ),
        usuario:gbp_usuarios(
          id,
          nome,
          email
        )
      `)
      .eq('empresa_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    handleSupabaseError(error, 'listar documentos');
    throw error;
  }
}