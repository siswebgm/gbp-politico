import { supabase } from '../../lib/supabase';
import { handleSupabaseError } from '../../utils/errorHandling';
import type { Document } from '../../types/document';

export async function updateDocument(id: number, updates: Partial<Document>): Promise<Document> {
  try {
    const { data, error } = await supabase
      .from('gbp_documentos')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        responsavel:gbp_usuarios(id, nome),
        tags:gbp_documentos_tags_rel(
          tag:gbp_documentos_tags(*)
        ),
        updates:gbp_documentos_updates(*),
        messages:gbp_documentos_messages(*),
        approvals:gbp_documentos_approvals(*)
      `)
      .single();

    if (error) {
      handleSupabaseError(error, 'atualizar documento');
    }

    if (!data) {
      throw new Error('Documento não encontrado');
    }

    return data;
  } catch (error) {
    handleSupabaseError(error, 'atualizar documento');
  }
}