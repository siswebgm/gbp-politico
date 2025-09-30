import { supabaseClient } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';

const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB por chunk

const sanitizeFileName = (fileName: string): string => {
  // Separar o nome do arquivo da extensão
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex !== -1 ? fileName.slice(0, lastDotIndex) : fileName;
  const extension = lastDotIndex !== -1 ? fileName.slice(lastDotIndex) : '';

  // Sanitizar apenas o nome do arquivo, mantendo a extensão intacta
  const sanitizedName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '_') // Substitui caracteres especiais por _
    .replace(/_+/g, '_') // Remove underscores múltiplos
    .replace(/^_|_$/g, ''); // Remove underscores no início e fim

  // Retornar o nome sanitizado com a extensão original
  return sanitizedName + extension;
};

export function useFileUpload() {
  const company = useCompanyStore(state => state.company);

  const uploadFile = async (file: File) => {
    try {
      if (!company?.uid) {
        throw new Error('Empresa não encontrada');
      }

      // Buscar o storage da empresa
      const { data: empresaData, error: empresaError } = await supabaseClient
        .from('gbp_empresas')
        .select('storage')
        .eq('uid', company.uid)
        .single();

      if (empresaError) {
        throw new Error('Erro ao buscar informações da empresa');
      }

      if (!empresaData?.storage) {
        throw new Error('Storage da empresa não configurado');
      }

      // Usar o storage da empresa como bucket
      const bucket = empresaData.storage;
      
      // Criar nome do arquivo seguro com timestamp
      const timestamp = new Date().getTime();
      const safeFileName = sanitizeFileName(file.name);
      const fileName = `${timestamp}_${safeFileName}`;

      // Upload no bucket da empresa
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;
      if (!uploadData?.path) {
        throw new Error('Erro ao obter caminho do arquivo');
      }

      // Obter URL pública do arquivo
      const { data: { publicUrl } } = supabaseClient.storage
        .from(bucket)
        .getPublicUrl(uploadData.path);

      return publicUrl;

    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      throw error;
    }
  };

  return {
    uploadFile
  };
}
