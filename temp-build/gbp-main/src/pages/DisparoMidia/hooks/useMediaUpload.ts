import { useState } from 'react';
import { supabaseClient } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';

const STORAGE_BUCKET = 'uploads';
const MAX_FILE_SIZE = 70 * 1024 * 1024; // 70MB
const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB por chunk

interface MediaFile {
  file: File;
  type: 'image' | 'video' | 'audio' | 'pdf';
  previewUrl: string;
}

export function useMediaUpload() {
  const company = useCompanyStore((state) => state.company);
  const [uploadProgress, setUploadProgress] = useState(0);

  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .trim();
  };

  const uploadInChunks = async (file: File, fileName: string, bucketName: string): Promise<string> => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let uploadedChunks = 0;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunk = file.slice(start, end);

      const { error: uploadError } = await supabaseClient.storage
        .from(bucketName)
        .upload(`${fileName}_part${i}`, chunk);

      if (uploadError) {
        throw uploadError;
      }

      uploadedChunks++;
      const progress = (uploadedChunks / totalChunks) * 100;
      setUploadProgress(progress);
    }

    // Combine chunks logic would go here in a real implementation
    const { data } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const uploadFile = async (file: File, fileName: string): Promise<string> => {
    if (!company?.uid) {
      throw new Error('Empresa não selecionada');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Arquivo muito grande. Máximo permitido: 70MB');
    }

    const sanitizedFileName = sanitizeFileName(fileName);
    const finalFileName = `${company.uid}/${sanitizedFileName}`;

    try {
      if (file.size > CHUNK_SIZE) {
        return await uploadInChunks(file, finalFileName, STORAGE_BUCKET);
      } else {
        const { error: uploadError } = await supabaseClient.storage
          .from(STORAGE_BUCKET)
          .upload(finalFileName, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabaseClient.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(finalFileName);

        return data.publicUrl;
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      throw error;
    }
  };

  return {
    uploadFile,
    uploadProgress,
  };
}
