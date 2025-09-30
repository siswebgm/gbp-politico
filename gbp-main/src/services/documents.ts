import { supabase } from '../lib/supabase';

export interface Document {
  id: number;
  title: string;
  type: 'law_project' | 'office' | 'requirement';
  description: string;
  status: 'draft' | 'review' | 'approved' | 'rejected' | 'archived';
  empresa_id: number;
  created_at: string;
}

const handleSupabaseError = (error: any, operation: string) => {
  console.error(`Supabase error during ${operation}:`, error);
  throw new Error(`Failed to ${operation}: ${error.message || 'Unknown error'}`);
};

export const documentService = {
  create: async (document: Omit<Document, 'id' | 'created_at'>): Promise<Document> => {
    try {
      if (!document.empresa_id) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .from('gbp_documentos')
        .insert([{
          ...document,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) handleSupabaseError(error, 'create document');
      if (!data) throw new Error('No data returned from Supabase');

      return data;
    } catch (error) {
      handleSupabaseError(error, 'create document');
    }
  },

  list: async (companyId: number, filters?: any): Promise<Document[]> => {
    try {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      let query = supabase
        .from('gbp_documentos')
        .select('*')
        .eq('empresa_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) handleSupabaseError(error, 'list documents');
      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'list documents');
    }
  },

  update: async (id: number, document: Partial<Document>): Promise<Document> => {
    try {
      if (!document.empresa_id) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .from('gbp_documentos')
        .update(document)
        .eq('id', id)
        .eq('empresa_id', document.empresa_id)
        .select()
        .single();

      if (error) handleSupabaseError(error, 'update document');
      if (!data) throw new Error('No data returned from Supabase');

      return data;
    } catch (error) {
      handleSupabaseError(error, 'update document');
    }
  },

  delete: async (id: number, companyId: number): Promise<void> => {
    try {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      const { error } = await supabase
        .from('gbp_documentos')
        .delete()
        .eq('id', id)
        .eq('empresa_id', companyId);

      if (error) handleSupabaseError(error, 'delete document');
    } catch (error) {
      handleSupabaseError(error, 'delete document');
    }
  },
};