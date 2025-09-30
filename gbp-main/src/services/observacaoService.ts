import { supabaseClient } from '../lib/supabase';
import { Observacao, ObservacaoFormData } from '../types/observacao';

class ObservacaoService {
  async create(data: ObservacaoFormData): Promise<Observacao> {
    try {
      console.log('[DEBUG] ObservacaoService.create - Criando observação:', data);

      // Primeiro, vamos buscar o próximo ID
      const { data: maxIdResult, error: maxIdError } = await supabaseClient
        .from('gbp_observacoes')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

      if (maxIdError) {
        console.error('[DEBUG] ObservacaoService.create - Erro ao buscar maxId:', maxIdError);
        throw maxIdError;
      }

      const nextId = maxIdResult && maxIdResult.length > 0 ? Number(maxIdResult[0].id) + 1 : 1;

      // Agora vamos criar a observação
      const { data: result, error } = await supabaseClient
        .from('gbp_observacoes')
        .insert({
          ...data,
          id: nextId
        })
        .select()
        .single();

      if (error) {
        console.error('[DEBUG] ObservacaoService.create - Erro:', error);
        throw error;
      }

      console.log('[DEBUG] ObservacaoService.create - Sucesso:', result);
      return result;
    } catch (error) {
      console.error('[DEBUG] ObservacaoService.create - Erro:', error);
      throw error;
    }
  }

  async list(atendimento_uid: string): Promise<Observacao[]> {
    try {
      console.log('[DEBUG] ObservacaoService.list - Buscando observações:', atendimento_uid);
      
      const { data, error } = await supabaseClient
        .from('gbp_observacoes')
        .select(`
          *,
          gbp_usuarios (
            nome
          )
        `)
        .eq('atendimento_uid', atendimento_uid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[DEBUG] ObservacaoService.list - Erro:', error);
        throw error;
      }

      console.log('[DEBUG] ObservacaoService.list - Sucesso:', data);
      return data || [];
    } catch (error) {
      console.error('[DEBUG] ObservacaoService.list - Erro:', error);
      throw error;
    }
  }
}

export const observacaoService = new ObservacaoService();
