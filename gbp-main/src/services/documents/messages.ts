import { supabase } from '../../lib/supabase';
import { handleSupabaseError } from '../../utils/errorHandling';
import type { DocumentMessage } from '../../types/document';

export async function addDocumentMessage(
  documentId: number,
  userId: number,
  message: string
): Promise<DocumentMessage> {
  try {
    const { data, error } = await supabase
      .from('gbp_documentos_messages')
      .insert([{
        documento_id: documentId,
        usuario_id: userId,
        mensagem: message,
      }])
      .select('*, usuario:gbp_usuarios(nome)')
      .single();

    if (error) {
      handleSupabaseError(error, 'adicionar mensagem');
    }

    if (!data) {
      throw new Error('Erro ao adicionar mensagem');
    }

    return data;
  } catch (error) {
    handleSupabaseError(error, 'adicionar mensagem');
  }
}

export async function markMessageAsRead(messageId: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('gbp_documentos_messages')
      .update({ lida: true })
      .eq('id', messageId);

    if (error) {
      handleSupabaseError(error, 'marcar mensagem como lida');
    }
  } catch (error) {
    handleSupabaseError(error, 'marcar mensagem como lida');
  }
}