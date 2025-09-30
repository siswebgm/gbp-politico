import { supabaseClient } from '../lib/supabase';

export type UploadStatus = 'success' | 'error' | 'in_progress' | 'deleted';

export interface UploadHistory {
  id: number;
  empresa_uid: string;
  arquivo_nome: string;
  registros_total: number;
  registros_processados: number;
  registros_erro?: number;
  status: UploadStatus;
  erro_mensagem?: string;
  created_at: string;
  updated_at: string;
  tipo_uid?: string;
  categoria_uid?: string;
  tipo?: {
    nome: string;
  };
  categoria?: {
    nome: string;
  };
}

export interface CreateUploadHistoryParams {
  arquivo_nome: string;
  empresa_uid: string;
  tipo_uid?: string;
  categoria_uid?: string;
}

export async function createUploadHistory(params: CreateUploadHistoryParams): Promise<{ uploadHistory: UploadHistory | null; error: Error | null }> {
  try {
    // Criar novo registro de histórico
    const { data: uploadHistory, error: insertError } = await supabaseClient
      .from('gbp_upload_history')
      .insert({
        arquivo_nome: params.arquivo_nome,
        empresa_uid: params.empresa_uid,
        tipo_uid: params.tipo_uid,
        categoria_uid: params.categoria_uid,
        status: 'in_progress',
        registros_total: 0,
        registros_processados: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        tipo:gbp_categoria_tipos!tipo_uid(nome),
        categoria:gbp_categorias!categoria_uid(nome)
      `)
      .single();

    if (insertError) {
      console.error('Erro ao criar histórico:', insertError);
      throw insertError;
    }

    return { uploadHistory, error: null };
  } catch (error) {
    console.error('Erro ao criar histórico:', error);
    return { uploadHistory: null, error: error as Error };
  }
}

export async function refreshUploadHistory(empresaUid: string): Promise<UploadHistory[]> {
  const { data, error } = await supabaseClient
    .from('gbp_upload_history')
    .select(`
      *,
      tipo:gbp_categoria_tipos!tipo_uid(nome),
      categoria:gbp_categorias!categoria_uid(nome)
    `)
    .eq('empresa_uid', empresaUid)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateUploadHistory(id: number, data: Partial<UploadHistory>): Promise<void> {
  const { error } = await supabaseClient
    .from('gbp_upload_history')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw error;
}
