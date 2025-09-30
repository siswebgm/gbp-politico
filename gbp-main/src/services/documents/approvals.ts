import { supabaseClient } from '../../lib/supabase';
import { handleSupabaseError } from '../../utils/errorHandling';
import type { DocumentApproval } from '../../types/document';

export async function updateDocumentApproval(
  documentId: number,
  userId: number,
  etapa: number,
  status: 'approved' | 'rejected',
  comentario?: string
): Promise<DocumentApproval> {
  try {
    const { data, error } = await supabaseClient
      .from('gbp_documentos_approvals')
      .upsert([{
        documento_id: documentId,
        usuario_id: userId,
        etapa,
        status,
        comentario,
        data_aprovacao: new Date().toISOString(),
      }])
      .select('*, usuario:gbp_usuarios(nome)')
      .single();

    if (error) {
      handleSupabaseError(error, 'atualizar aprovação');
    }

    if (!data) {
      throw new Error('Erro ao atualizar aprovação');
    }

    // Update document status if all approvals are complete
    await updateDocumentStatusBasedOnApprovals(documentId);

    return data;
  } catch (error) {
    handleSupabaseError(error, 'atualizar aprovação');
  }
}

async function updateDocumentStatusBasedOnApprovals(documentId: number): Promise<void> {
  try {
    const { data: approvals, error } = await supabaseClient
      .from('gbp_documentos_approvals')
      .select('status')
      .eq('documento_id', documentId);

    if (error) {
      handleSupabaseError(error, 'verificar aprovações');
    }

    if (!approvals?.length) return;

    const allApproved = approvals.every(a => a.status === 'approved');
    const anyRejected = approvals.some(a => a.status === 'rejected');

    let newStatus: 'approved' | 'rejected' | 'review' = 'review';
    if (allApproved) newStatus = 'approved';
    if (anyRejected) newStatus = 'rejected';

    const { error: updateError } = await supabaseClient
      .from('gbp_documentos')
      .update({ status: newStatus })
      .eq('id', documentId);

    if (updateError) {
      handleSupabaseError(updateError, 'atualizar status do documento');
    }
  } catch (error) {
    handleSupabaseError(error, 'atualizar status do documento');
  }
}