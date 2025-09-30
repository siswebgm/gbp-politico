import { supabaseClient } from '../lib/supabase';
import { Document, DocumentFormData } from '../pages/Documents/types';

export const documentService = {
  async list(companyId: string, filters?: Record<string, any>): Promise<Document[]> {
    const query = supabaseClient
      .from('gbp_documentos')
      .select('*')
      .eq('empresa_id', companyId);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          query.eq(key, value);
        }
      });
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('[ERROR] Erro ao listar documentos:', error);
      throw error;
    }

    return data || [];
  },

  async getById(id: string): Promise<Document> {
    const { data, error } = await supabaseClient
      .from('gbp_documentos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[ERROR] Erro ao buscar documento:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Documento não encontrado');
    }

    return data;
  },

  async create(companyId: string, document: DocumentFormData): Promise<Document> {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_documentos')
        .insert([
          {
            ...document,
            empresa_id: companyId,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('[ERROR] Erro ao criar documento:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('[ERROR] Erro ao criar documento:', error);
      throw error;
    }
  },

  async update(id: string, document: Partial<DocumentFormData>): Promise<Document> {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_documentos')
        .update({
          ...document,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[ERROR] Erro ao atualizar documento:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('[ERROR] Erro ao atualizar documento:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabaseClient
        .from('gbp_documentos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[ERROR] Erro ao excluir documento:', error);
        throw error;
      }
    } catch (error) {
      console.error('[ERROR] Erro ao excluir documento:', error);
      throw error;
    }
  },

  getDownloadUrl(id: string): string {
    return `${import.meta.env.VITE_API_URL}/documents/${id}/download`;
  }
};
