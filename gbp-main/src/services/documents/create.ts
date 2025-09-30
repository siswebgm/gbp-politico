import { supabase } from '../../lib/supabase';
import { handleSupabaseError } from '../../utils/errorHandling';
import type { Document } from '../../types/document';

export async function createDocument(
  document: Omit<Document, 'id' | 'created_at' | 'tags' | 'updates' | 'messages' | 'approvals'>
): Promise<Document> {
  try {
    if (!document.empresa_id) {
      throw new Error('ID da empresa é obrigatório');
    }

    // Create document
    const { data, error } = await supabase
      .from('gbp_documentos')
      .insert([{
        titulo: document.titulo.toUpperCase(),
        tipo: document.tipo,
        descricao: document.descricao,
        status: document.status,
        responsavel_id: document.responsavel_id,
        empresa_id: document.empresa_id,
      }])
      .select(`
        *,
        responsavel:gbp_usuarios(id, nome),
        tags:gbp_documentos_tags_rel(
          tag:gbp_documentos_tags(*)
        )
      `)
      .single();

    if (error) {
      handleSupabaseError(error, 'criar documento');
    }

    if (!data) {
      throw new Error('Erro ao criar documento');
    }

    return data;
  } catch (error) {
    handleSupabaseError(error, 'criar documento');
  }
}