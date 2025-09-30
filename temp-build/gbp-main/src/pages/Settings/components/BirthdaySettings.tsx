import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { Loader2, AlertCircle, Trash2, Save, MessageSquare } from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';
import { useToast } from "../../../components/ui/use-toast";
import { useAuth } from '../../../providers/AuthProvider';

const birthdaySchema = z.object({
  texto_aniversario: z.string().nullable(),
  imagem_aniversario: z.string().nullable(),
  video_aniversario: z.string().nullable(),
  audio_aniversario: z.string().nullable(),
  saudacao_niver: z.boolean().default(true),
});

type BirthdayFormData = z.infer<typeof birthdaySchema>;

export function BirthdaySettings() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentFiles, setCurrentFiles] = useState<BirthdayFormData>({
    texto_aniversario: '',
    imagem_aniversario: '',
    video_aniversario: '',
    audio_aniversario: '',
    saudacao_niver: true,
  });
  const [initialFiles, setInitialFiles] = useState<BirthdayFormData>({
    texto_aniversario: '',
    imagem_aniversario: '',
    video_aniversario: '',
    audio_aniversario: '',
    saudacao_niver: true,
  });
  const [newFiles, setNewFiles] = useState<{[key: string]: File}>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const company = useCompanyStore((state) => state.company);
  const { register, handleSubmit, formState: { isSubmitting }, setValue, watch } = useForm<BirthdayFormData>();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, session, user } = useAuth();
  
  const saudacaoAtiva = watch('saudacao_niver', true);

  const formValues = watch();

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (type === 'change') {
        setHasUnsavedChanges(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  useEffect(() => {
    if (Object.keys(newFiles).length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [newFiles]);

  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-zA-Z0-9.]/g, '_') // Substitui caracteres especiais por _
      .replace(/_+/g, '_') // Remove underscores múltiplos
      .toLowerCase();
  };

  const handleFileSelect = (file: File, type: 'imagem' | 'video' | 'audio') => {
    try {
      // Validar tamanho do arquivo (70MB)
      const MAX_SIZE = 70 * 1024 * 1024; // 70MB
      if (file.size > MAX_SIZE) {
        throw new Error('Arquivo muito grande. O tamanho máximo é 70MB.');
      }

      // Validar tipo de arquivo para imagem
      if (type === 'imagem') {
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedImageTypes.includes(file.type)) {
          throw new Error('Formato de imagem inválido. Use apenas JPG, PNG, GIF ou WEBP.');
        }
      }

      // Criar URL temporária para preview
      const previewUrl = URL.createObjectURL(file);
      
      // Armazenar o arquivo para upload posterior
      setNewFiles(prev => ({
        ...prev,
        [`${type}_aniversario`]: file
      }));

      // Atualizar preview
      setCurrentFiles(prev => ({
        ...prev,
        [`${type}_aniversario`]: previewUrl
      }));
    } catch (err) {
      console.error('Erro ao selecionar arquivo:', err);
      toast({
        variant: "error",
        description: `Erro ao selecionar ${type}: ${err.message}`,
      });
      setError(err.message);
    }
  };

  const handleRemoveFile = (type: 'imagem' | 'video' | 'audio') => {
    // Limpar URL temporária se existir
    const currentUrl = currentFiles[`${type}_aniversario`];
    if (currentUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(currentUrl);
    }

    // Remover arquivo do estado
    setNewFiles(prev => {
      const next = { ...prev };
      delete next[`${type}_aniversario`];
      return next;
    });

    // Limpar preview
    setCurrentFiles(prev => ({
      ...prev,
      [`${type}_aniversario`]: ''
    }));

    setHasUnsavedChanges(true); // Marca que há alterações não salvas ao remover arquivo
  };

  useEffect(() => {
    const loadSettings = async () => {
      if (!company?.uid) return;

      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabaseClient
          .from('gbp_empresas')
          .select('texto_aniversario, imagem_aniversario, video_aniversario, audio_aniversario, saudacao_niver')
          .eq('uid', company.uid)
          .single();

        if (error) throw error;

        const settings: BirthdayFormData = {
          texto_aniversario: data.texto_aniversario || '',
          imagem_aniversario: data.imagem_aniversario || '',
          video_aniversario: data.video_aniversario || '',
          audio_aniversario: data.audio_aniversario || '',
          saudacao_niver: data.saudacao_niver ?? true,
        };

        setCurrentFiles(settings);
        setInitialFiles(settings);
        
        // Atualizar form com os valores
        Object.entries(settings).forEach(([key, value]) => {
          setValue(key as keyof BirthdayFormData, value);
        });
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
        toast({
          variant: "error",
          description: "Erro ao carregar configurações",
        });
        setError('Erro ao carregar configurações');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();

    // Cleanup de URLs temporárias ao desmontar
    return () => {
      Object.values(currentFiles).forEach(url => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [company?.uid]);

  const onSubmit = async (data: BirthdayFormData) => {
    if (!company?.uid) return;

    try {
      setError(null);

      // Buscar o nome do bucket da empresa
      const { data: empresaData, error: empresaError } = await supabaseClient
        .from('gbp_empresas')
        .select('storage')
        .eq('uid', company.uid)
        .single();

      if (empresaError) throw empresaError;
      if (!empresaData.storage) {
        throw new Error('Nome do storage não configurado para esta empresa');
      }

      const bucket = empresaData.storage;
      const newUrls: Partial<BirthdayFormData> = {};

      // Fazer upload dos novos arquivos
      for (const [key, file] of Object.entries(newFiles)) {
        const timestamp = new Date().getTime();
        const sanitizedName = sanitizeFileName(file.name);
        const fileName = `${timestamp}_${sanitizedName}`;

        const { error: uploadError, data: uploadData } = await supabaseClient.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
        if (!uploadData?.path) {
          throw new Error(`Erro ao obter URL do arquivo ${key}`);
        }

        const { data: { publicUrl } } = supabaseClient.storage
          .from(bucket)
          .getPublicUrl(uploadData.path);

        newUrls[key] = publicUrl;
      }

      // Remover arquivos antigos que foram substituídos
      for (const [key, _] of Object.entries(newFiles)) {
        const oldUrl = initialFiles[key as keyof BirthdayFormData];
        if (typeof oldUrl === 'string' && oldUrl) {
          const oldFileName = oldUrl.split('/').pop();
          if (oldFileName) {
            try {
              await supabaseClient.storage
                .from(bucket)
                .remove([oldFileName]);
            } catch (err) {
              console.warn('Erro ao remover arquivo antigo:', err);
            }
          }
        }
      }

      // Atualizar o banco com os novos valores
      const { error } = await supabaseClient
        .from('gbp_empresas')
        .update({
          texto_aniversario: data.texto_aniversario,
          imagem_aniversario: newUrls.imagem_aniversario || currentFiles.imagem_aniversario || '',
          video_aniversario: newUrls.video_aniversario || currentFiles.video_aniversario || '',
          audio_aniversario: newUrls.audio_aniversario || currentFiles.audio_aniversario || '',
          saudacao_niver: data.saudacao_niver,
        })
        .eq('uid', company.uid);

      if (error) throw error;

      // Limpar URLs temporárias
      Object.values(currentFiles).forEach(url => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });

      // Atualizar estados com as novas URLs
      const updatedFiles = {
        ...currentFiles,
        ...newUrls
      };

      setNewFiles({});
      setInitialFiles(updatedFiles);
      setCurrentFiles(updatedFiles);

      setHasUnsavedChanges(false);
      
      toast({
        description: "✨ Configurações salvas com sucesso!",
        variant: "success"
      });
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast({
        variant: "error",
        description: `Não foi possível salvar as configurações: ${err.message}`,
      });
      setError('Erro ao salvar configurações');
    }
  };

  const [isTesting, setIsTesting] = useState(false);

  const handleTestMessage = async () => {
    try {
      setIsTesting(true);
      setError(null);

      const response = await fetch('https://whkn8n.guardia.work/webhook/gbp_disparo_aniversario_teste_user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Informações do usuário
          user: {
            uid: user?.uid,
            email: user?.email,
            nome: user?.nome,
            nivel_acesso: user?.nivel_acesso,
            telefone: user?.telefone,
            contato: user?.contato || user?.telefone // Usa o contato se existir, senão usa o telefone
          },
          // Informações da empresa
          company: {
            uid: company?.uid,
            nome: company?.nome,
            storage: company?.storage,
            plano: company?.plano,
            token: company?.token,
            porta: company?.porta,
            instancia: company?.instancia
          },
          // Configurações da mensagem
          texto_aniversario: watch('texto_aniversario'),
          imagem_aniversario: currentFiles.imagem_aniversario,
          video_aniversario: currentFiles.video_aniversario,
          audio_aniversario: currentFiles.audio_aniversario,
          saudacao_niver: watch('saudacao_niver'),
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao testar mensagem');
      }

      toast({
        description: "✨ Mensagem de teste enviada com sucesso!",
        variant: "success"
      });
    } catch (err) {
      console.error('Erro ao testar mensagem:', err);
      toast({
        variant: "error",
        description: `Não foi possível testar a mensagem: ${err.message}`,
      });
      setError('Erro ao testar mensagem');
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 px-0 py-6">
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-400 p-4 mb-6 rounded-r-lg shadow-sm">
        <p className="text-sm text-blue-700 space-y-2">
          <strong className="block text-base mb-2">Configuração da Mensagem de Aniversário</strong>
          <span className="block mb-3">Nesta página você configura o conteúdo da mensagem automática que será enviada aos seus eleitores no dia do aniversário deles.</span>
          
          <strong className="block mt-4 mb-1">Como funciona:</strong>
          <span className="block">• O texto da mensagem é obrigatório e será sempre enviado.</span>
          <span className="block">• Você pode adicionar uma imagem OU um vídeo (o vídeo substituirá a imagem).</span>
          <span className="block">• O áudio é opcional e pode ser enviado junto com qualquer combinação acima.</span>
          
          <span className="block mt-4 text-xs text-blue-600"> A mensagem será enviada automaticamente no dia do aniversário de cada eleitor.</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('saudacao_niver')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ms-3 text-sm font-medium text-gray-700">Incluir saudação com nome do eleitor</span>
            </label>
            <div className="text-xs text-gray-500 sm:text-right">
              {saudacaoAtiva ? 'Ex: "Olá João, "' : 'Mensagem sem saudação inicial'}
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-t border-gray-100 pt-4">
              <label className="block text-base font-medium text-gray-800 mb-1">
                Texto da Mensagem de Aniversário
              </label>
              <p className="text-sm text-gray-500 mb-3">
                {saudacaoAtiva ? 
                  'A mensagem começará com "Olá [Nome do Eleitor]," seguida do texto abaixo:' : 
                  'Digite a mensagem que será enviada no aniversário:'}
              </p>
              <textarea
                {...register('texto_aniversario')}
                rows={4}
                className="w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 resize-none p-4 hover:border-gray-400 transition-colors"
                placeholder={saudacaoAtiva ? 
                  "Ex: Feliz aniversário! Que seu dia seja repleto de alegrias..." :
                  "Ex: Olá! Feliz aniversário! Que seu dia seja repleto de alegrias..."}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['imagem', 'video', 'audio'].map((type) => {
            const icon = type === 'imagem' ? '🖼️' : type === 'video' ? '🎥' : '🎵';
            const accept = type === 'imagem' ? '.jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp' : `${type}/*`;
            
            return (
              <div key={type} className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {icon} {type.charAt(0).toUpperCase() + type.slice(1)}
                  </label>
                  {currentFiles[`${type}_aniversario` as keyof BirthdayFormData] && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(type as 'imagem' | 'video' | 'audio')}
                      className="text-red-500 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="relative w-full h-48">
                  {currentFiles[`${type}_aniversario` as keyof BirthdayFormData] ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                      {type === 'imagem' && (
                        <img
                          src={currentFiles.imagem_aniversario}
                          alt="Preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      )}
                      {type === 'video' && (
                        <video
                          src={currentFiles.video_aniversario}
                          controls
                          className="max-w-full max-h-full"
                        />
                      )}
                      {type === 'audio' && (
                        <audio
                          src={currentFiles.audio_aniversario}
                          controls
                          className="w-full"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="relative h-full">
                      <input
                        type="file"
                        accept={accept}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file, type as 'imagem' | 'video' | 'audio');
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="absolute inset-0 border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center hover:border-blue-400 transition-colors">
                        <div className="text-3xl mb-2">{icon}</div>
                        <p className="text-sm text-gray-600">Clique ou arraste um arquivo</p>
                        <p className="text-xs text-gray-500 mt-1">formato: {type}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="sm:inline">Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span className="sm:inline">Salvar Configurações</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleTestMessage}
            disabled={isTesting || !company?.uid || hasUnsavedChanges}
            className="py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="sm:inline">Testando...</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4" />
                <span className="sm:inline">{hasUnsavedChanges ? 'Salve as alterações primeiro' : 'Testar Mensagem'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}