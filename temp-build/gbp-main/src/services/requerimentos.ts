import { supabaseClient } from '../lib/supabase';

export interface Requerimento {
  arquivos?: { nome: string; url: string }[];
  uid: string;
  empresa_uid: string;
  numero: string;
  titulo: string;
  solicitante: string;
  descricao: string | null;
  tipo: string;
  data_emissao: string;
  solicitacao_especifica: string | null;
  prioridade: string;
  status: string;
  assinatura: any | null; // JSONB
  protocolo: string | null;
  created_at?: string;
  updated_at?: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at?: string | null;
}

export const requerimentosService = {
  async criar(requerimento: Omit<Requerimento, 'uid' | 'created_at' | 'updated_at'>, usuarioUid: string) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_requerimentos')
        .insert([{ ...requerimento, created_by: usuarioUid, updated_by: usuarioUid }])
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao criar requerimento:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Erro ao criar requerimento:', error);
      throw error;
    }
  },

  async atualizar(uid: string, requerimento: Partial<Requerimento>, usuarioUid: string) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_requerimentos')
        .update({ ...requerimento, updated_at: new Date().toISOString(), updated_by: usuarioUid })
        .eq('uid', uid)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar requerimento:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Erro ao atualizar requerimento:', error);
      throw error;
    }
  },

    async uploadArquivos(files: File[], companyUid: string, bucketName: string): Promise<{ nome: string; url: string }[]> {
    const uploadedFiles: { nome: string; url: string }[] = [];

    for (const file of files) {
      const sanitizedFileName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_.-]/gi, '_')
        .toLowerCase();

      const filePath = `${companyUid}/${sanitizedFileName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error(`Erro no upload do arquivo ${file.name}:`, uploadError);
        throw new Error(`Falha no upload do arquivo: ${file.name}. Detalhes: ${uploadError.message}`);
      }

      const { data: urlData } = supabaseClient.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (!urlData) {
        throw new Error(`Não foi possível obter a URL pública para o arquivo ${file.name}.`);
      }

      uploadedFiles.push({ nome: file.name, url: urlData.publicUrl });
    }

    return uploadedFiles;
  },

  async deletar(uid: string, usuarioUid: string) {
    try {
      const { error } = await supabaseClient
        .from('gbp_requerimentos')
        .update({ deleted_at: new Date().toISOString(), updated_by: usuarioUid })
        .eq('uid', uid);

      if (error) {
        console.error('Erro ao deletar requerimento:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erro ao deletar requerimento:', error);
      throw error;
    }
  },

  async buscarPorId(uid: string) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_requerimentos')
        .select('*')
        .eq('uid', uid)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Erro ao buscar requerimento:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Erro ao buscar requerimento:', error);
      throw error;
    }
  },

  async listar(empresaUid: string) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_requerimentos')
        .select('*')
        .eq('empresa_uid', empresaUid)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao listar requerimentos:', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Erro ao listar requerimentos:', error);
      throw error;
    }
  },

  async buscarProximoNumero(empresaUid: string): Promise<string> {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_requerimentos')
        .select('numero')
        .eq('empresa_uid', empresaUid)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 é o código para nenhum resultado encontrado
        console.error('Erro ao buscar último número de requerimento:', error);
        throw error;
      }

      // Se não encontrar nenhum requerimento, começa com 1
      if (!data) {
        return '1';
      }

      // Converte o número para inteiro, soma 1 e retorna como string
      const ultimoNumero = parseInt(data.numero, 10) || 0;
      return (ultimoNumero + 1).toString();
    } catch (error) {
      console.error('Erro ao buscar próximo número de requerimento:', error);
      // Em caso de erro, retorna 1 como fallback
      return '1';
    }
  },
};
