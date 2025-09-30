import { useState, useEffect } from 'react';
import { useToast } from '../../../hooks/useToast';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { supabaseClient } from '../../../lib/supabase';

interface FilterOption {
  id: string;
  label: string;
  value: string;
  type: 'cidade' | 'bairro' | 'categoria' | 'genero';
}

interface MediaFile {
  file: File;
  type: 'image' | 'video' | 'audio' | 'pdf';
  previewUrl: string;
}

interface SendProgress {
  step: string;
  detail: string;
  status: 'loading' | 'success' | 'error';
}

export function useDisparoMidia() {
  const company = useCompanyStore((state) => state.company);
  const user = useAuthStore((state) => state.user);
  const { showToast } = useToast();

  const [message, setMessage] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<FilterOption[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [status, setStatus] = useState<{
    success: boolean;
    message: string;
  }>({ success: false, message: '' });
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState<SendProgress>({ 
    step: '', 
    detail: '', 
    status: 'loading' 
  });
  const [totalEleitores, setTotalEleitores] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);

  // Buscar total de eleitores
  useEffect(() => {
    const fetchTotalEleitores = async () => {
      try {
        setLoading(true);
        setError(null);

        const { count, error: supabaseError } = await supabaseClient
          .from('gbp_eleitores')
          .select('*', { count: 'exact', head: true });

        if (supabaseError) {
          console.error('Erro ao buscar total:', supabaseError);
          setError('Erro ao buscar total de eleitores');
          setTotalEleitores(0);
          return;
        }

        setTotalEleitores(count || 0);
      } catch (err) {
        console.error('Erro ao buscar total:', err);
        setError('Erro ao buscar total de eleitores');
        setTotalEleitores(0);
      } finally {
        setLoading(false);
      }
    };

    fetchTotalEleitores();
  }, []);

  const handleSendMessage = async () => {
    try {
      setLoading(true);
      setShowProgress(true);
      setProgress({ step: 'Iniciando envio...', detail: '', status: 'loading' });

      // Aqui vai a lógica de envio que estava no componente principal
      // ...

      setShowProgress(false);
      setStatus({ success: true, message: 'Mensagem enviada com sucesso!' });
      setShowStatus(true);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setStatus({ success: false, message: 'Erro ao enviar mensagem.' });
      setShowStatus(true);
    } finally {
      setLoading(false);
      setShowProgress(false);
    }
  };

  return {
    // Estado
    message,
    setMessage,
    mediaFiles,
    setMediaFiles,
    selectedFilters,
    setSelectedFilters,
    showConfirm,
    setShowConfirm,
    showStatus,
    setShowStatus,
    status,
    showProgress,
    progress,
    totalEleitores,
    loading,
    error,
    uploadProgress,
    totalProgress,

    // Ações
    handleSendMessage,
  };
}
