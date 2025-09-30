import { useState } from 'react';
import { useToast } from './useToast';
import { supabaseClient } from '../lib/supabase';
import { FilterOption } from '../types/filters';
import { MediaFile } from '../types/media';
import { sanitizeFileName } from '../utils/fileUtils';
import { uploadFile } from '../services/uploadService';

interface SendProgress {
  total: number;
  current: number;
  step: string;
}

interface UseMessageSenderReturn {
  loading: boolean;
  error: string | null;
  progress: SendProgress;
  sendMessage: (message: string, selectedFilters: FilterOption[], mediaFiles: MediaFile[]) => Promise<void>;
}

export function useMessageSender(): UseMessageSenderReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<SendProgress>({ total: 0, current: 0, step: '' });
  const { showToast } = useToast();

  const sendMessage = async (message: string, selectedFilters: FilterOption[], mediaFiles: MediaFile[]) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Buscar eleitores
      setProgress({ total: 0, current: 0, step: 'Buscando eleitores...' });
      const eleitores = await fetchEleitores(selectedFilters);

      if (!eleitores || eleitores.length === 0) {
        throw new Error('Nenhum eleitor encontrado com os filtros selecionados');
      }

      setProgress({ total: eleitores.length, current: 0, step: 'Enviando mensagens...' });

      // 2. Upload de mídia
      const mediaUrls = await handleMediaUpload(mediaFiles, setProgress);

      // 3. Enviar mensagens
      await sendMessages(eleitores, message, mediaUrls, setProgress);

      showToast('Mensagens enviadas com sucesso!', 'success');
      return Promise.resolve();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar mensagens';
      console.error('Erro ao enviar mensagens:', err);
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return Promise.reject(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    progress,
    sendMessage
  };
}

// Funções auxiliares
async function fetchEleitores(selectedFilters: FilterOption[]) {
  const query = supabaseClient
    .from('gbp_eleitores')
    .select('uid, nome, telefone');

  // Aplicar filtros
  selectedFilters.forEach(filter => {
    switch (filter.type) {
      case 'cidade':
        query.eq('cidade', filter.value);
        break;
      case 'bairro':
        query.eq('bairro', filter.value);
        break;
      case 'categoria':
        query.eq('categoria_uid', filter.value);
        break;
      case 'genero':
        query.eq('genero', filter.value);
        break;
    }
  });

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar eleitores:', error);
    throw new Error('Erro ao buscar eleitores');
  }

  return data;
}

async function handleMediaUpload(
  mediaFiles: MediaFile[],
  setProgress: (progress: SendProgress) => void
) {
  const mediaUrls: string[] = [];

  if (mediaFiles.length > 0) {
    setProgress(prev => ({ ...prev, step: 'Fazendo upload dos arquivos de mídia...' }));

    for (const [index, media] of mediaFiles.entries()) {
      const fileName = `${Date.now()}-${sanitizeFileName(media.file.name)}`;
      const url = await uploadFile(media.file, fileName, 'empresa-nome');
      mediaUrls.push(url);
      
      setProgress(prev => ({
        ...prev,
        step: `Upload de mídia ${index + 1}/${mediaFiles.length}...`
      }));
    }
  }

  return mediaUrls;
}

async function sendMessages(
  eleitores: any[],
  message: string,
  mediaUrls: string[],
  setProgress: (progress: SendProgress) => void
) {
  for (const [index, eleitor] of eleitores.entries()) {
    setProgress(prev => ({
      ...prev,
      current: index + 1,
      step: `Enviando mensagem ${index + 1}/${eleitores.length}...`
    }));

    // TODO: Implementar a lógica real de envio
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
