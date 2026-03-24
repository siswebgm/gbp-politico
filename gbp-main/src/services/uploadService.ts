import { supabaseClient } from '../lib/supabase';

const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB por chunk

// Tipos para upload de arquivos
export type TipoUpload = 'candidatos' | 'documentos' | 'outros';

/**
 * Faz upload de um arquivo para o storage
 * @param file Arquivo a ser enviado
 * @param empresaId ID da empresa (será usado como pasta)
 * @param tipo Tipo de upload (define a subpasta)
 * @param nomePersonalizado Nome personalizado para o arquivo (opcional)
 * @returns URL pública do arquivo
 */
export async function uploadFile(
  file: File, 
  empresaId: string,
  tipo: TipoUpload = 'outros',
  nomePersonalizado?: string,
  bucketName: string = 'uploads'
): Promise<string> {
  try {
    // Gera um nome de arquivo único se não for fornecido um nome personalizado
    const extensao = file.name.split('.').pop() || '';
    const nomeArquivo = nomePersonalizado || 
      `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${extensao}`;
    
    // Cria um caminho estruturado: empresa_id/tipo/nome_arquivo.extensao
    const finalFileName = `${empresaId}/${tipo}/${nomeArquivo}`;

    // Upload direto (Supabase Storage já suporta arquivos grandes)
    const { error: uploadError } = await supabaseClient.storage
      .from(bucketName)
      .upload(finalFileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Erro ao fazer upload:', uploadError);
      throw new Error(`Erro ao fazer upload do arquivo: ${uploadError.message}`);
    }

    // Obtém a URL pública do arquivo
    const { data: { publicUrl } } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(finalFileName);

    // Se não tiver domínio, adiciona o domínio do Supabase
    if (publicUrl && !publicUrl.startsWith('http')) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${finalFileName}`;
    }

    return publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    throw error;
  }
}

/**
 * Faz upload da imagem de um candidato
 * @param file Arquivo de imagem do candidato
 * @param empresaId ID da empresa
 * @param candidatoId ID do candidato (opcional, se não informado será gerado um ID único)
 * @returns URL pública da imagem
 */
export async function uploadImagemCandidato(
  file: File, 
  empresaId: string,
  candidatoId?: string
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo deve ser uma imagem');
  }

  const nomeArquivo = candidatoId ? 
    `candidato_${candidatoId}` : 
    `candidato_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  return uploadFile(file, empresaId, 'candidatos', nomeArquivo);
}

/**
 * Remove um arquivo do storage
 * @param filePath Caminho do arquivo a ser removido (relativo ao bucket)
 * @returns Resultado da operação
 */
export async function removerArquivo(filePath: string): Promise<boolean> {
  try {
    // Extrai o caminho sem o domínio/base
    const pathParts = filePath.split('/');
    const bucketName = pathParts[0] || 'uploads';
    const fileKey = pathParts.slice(1).join('/');
    
    const { error } = await supabaseClient.storage
      .from(bucketName)
      .remove([fileKey]);
    
    if (error) {
      console.error('Erro ao remover arquivo:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao remover arquivo:', error);
    return false;
  }
}
