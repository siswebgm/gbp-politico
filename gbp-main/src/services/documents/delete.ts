import { supabase } from '../../lib/supabase';
import { handleSupabaseError } from '../../utils/errorHandling';

export async function deleteDocument(id: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('gbp_documentos')
      .delete()
      .eq('id', id);

    if (error) {
      handleSupabaseError(error, 'excluir documento');
    }
  } catch (error) {
    handleSupabaseError(error, 'excluir documento');
  }
}