import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Upload, FileText, X, Loader2, ChevronDown } from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useAuth } from '../../../providers/AuthProvider';
import { toast } from 'react-toastify';
import { Fragment } from 'react';

interface Oficio {
  uid: string;
  numero_oficio: string;
  tipo_de_demanda: string;
  status_solicitacao: string;
  url_oficio_protocolado?: string;
  data_solicitacao: string;
  nivel_de_urgencia: string;
  descricao_do_problema: string;
  requerente_nome: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  responsavel_nome: string;
}

const EditarOficio: React.FC = () => {
  const navigate = useNavigate();
  const { uid } = useParams<{ uid: string }>();
  const { company } = useCompanyStore();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [oficio, setOficio] = useState<Oficio | null>(null);
  const [numeroOficio, setNumeroOficio] = useState('');
  const [tipoDemanda, setTipoDemanda] = useState('');
  const [status, setStatus] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [tiposDemanda, setTiposDemanda] = useState<string[]>([]);
  const [showDeleteFileModal, setShowDeleteFileModal] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [arquivoAtual, setArquivoAtual] = useState<string | null>(null);

  useEffect(() => {
    if (uid) {
      fetchOficio();
    }
  }, [uid]);

  useEffect(() => {
    fetchTiposDemanda();
  }, [company?.uid]);

  const fetchTiposDemanda = async () => {
    if (!company?.uid) return;
    
    try {
      const { data, error } = await supabaseClient
        .from('gbp_demanda_tipo')
        .select('nome_tipo')
        .eq('empresa_uid', company.uid);

      if (error) {
        console.error('Erro ao carregar tipos de demanda:', error);
        return;
      }

      if (data && data.length > 0) {
        const tiposSet = new Set<string>();
        
        data.forEach(record => {
          if (record.nome_tipo && Array.isArray(record.nome_tipo)) {
            record.nome_tipo.forEach((item: string) => {
              if (item && item.trim() !== '') {
                tiposSet.add(item.trim());
              }
            });
          }
        });

        const tiposOrdenados = Array.from(tiposSet).sort();
        setTiposDemanda(tiposOrdenados);
      }
    } catch (error) {
      console.error('Erro ao buscar tipos de demanda:', error);
    }
  };

  const fetchOficio = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabaseClient
        .from('gbp_oficios')
        .select('*')
        .eq('uid', uid)
        .single();

      if (error) throw error;

      setOficio(data);
      setNumeroOficio(data.numero_oficio);
      setTipoDemanda(data.tipo_de_demanda);
      setStatus(data.status_solicitacao);
      setArquivoAtual(data.url_oficio_protocolado || null);
    } catch (error) {
      console.error('Erro ao buscar ofício:', error);
      toast.error('Erro ao carregar ofício');
      navigate(-1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleDeleteFile = async () => {
    try {
      setIsDeletingFile(true);
      
      // Atualizar ofício removendo a URL do arquivo
      const { error } = await supabaseClient
        .from('gbp_oficios')
        .update({
          url_oficio_protocolado: null
        })
        .eq('uid', uid);

      if (error) throw error;

      setArquivoAtual(null);
      if (oficio) {
        setOficio({ ...oficio, url_oficio_protocolado: undefined });
      }
      setShowDeleteFileModal(false);
      toast.success('Arquivo excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir arquivo:', error);
      toast.error('Erro ao excluir arquivo');
    } finally {
      setIsDeletingFile(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      let publicUrl = oficio?.url_oficio_protocolado || '';

      // Upload do novo arquivo se houver
      if (uploadFile) {
        const { data: empresaData, error: storageError } = await supabaseClient
          .from('gbp_empresas')
          .select('storage')
          .eq('uid', company.uid)
          .single();

        if (storageError) throw storageError;
        if (!empresaData?.storage) throw new Error('Storage da empresa não encontrado');

        const fileExt = uploadFile.name.split('.').pop();
        const timestamp = new Date().getTime();
        const fileName = `${numeroOficio.replace('/', '-')}_protocolo_${timestamp}.${fileExt}`;
        const filePath = `oficios/${fileName}`;

        const { error: uploadError } = await supabaseClient.storage
          .from(empresaData.storage)
          .upload(filePath, uploadFile, {
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl: url } } = supabaseClient.storage
          .from(empresaData.storage)
          .getPublicUrl(filePath);

        publicUrl = url.replace('supabase.co', 'studio.gbppolitico.com');
      }

      // Atualizar ofício
      const { error } = await supabaseClient
        .from('gbp_oficios')
        .update({
          numero_oficio: numeroOficio,
          tipo_de_demanda: tipoDemanda,
          status_solicitacao: status,
          url_oficio_protocolado: publicUrl
        })
        .eq('uid', uid);

      if (error) throw error;

      toast.success('Ofício atualizado com sucesso!');
      navigate(-1);
    } catch (error) {
      console.error('Erro ao salvar ofício:', error);
      toast.error('Erro ao atualizar ofício');
    } finally {
      setIsSaving(false);
    }
  };

  // Agrupar tipos de demanda
  const tiposDemandaGroups = tiposDemanda.reduce((acc, tipo) => {
    const [mainType, subType] = tipo.includes('::') ? tipo.split('::') : ['Outros', tipo];
    if (!acc[mainType]) {
      acc[mainType] = [];
    }
    acc[mainType].push(subType);
    return acc;
  }, {} as Record<string, string[]>);

  const getGroupIcon = (group: string) => {
    const icons: Record<string, string> = {
      'Secretarias': '🏛️',
      'Infraestrutura': '🏗️',
      'Serviços Públicos': '🚧',
      'Meio Ambiente': '🌳',
      'Saúde': '🏥',
      'Educação': '📚',
      'Segurança': '🚔',
      'Transporte': '🚌',
      'Outros': '📋'
    };
    return icons[group] || '📋';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!oficio) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-slate-500">Ofício não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Editar Ofício</h1>
                <p className="text-sm text-slate-500 mt-1">Ofício Nº {oficio.numero_oficio}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-sm border border-slate-200 p-6 space-y-6">
          {/* Número do Ofício */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Número do Ofício *
            </label>
            <input
              type="text"
              value={numeroOficio}
              onChange={(e) => setNumeroOficio(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: 123/2025"
            />
          </div>

          {/* Tipo de Demanda */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de Demanda *
            </label>
            <div className="relative">
              <select
                value={tipoDemanda}
                onChange={(e) => setTipoDemanda(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none"
              >
                <option value="">Selecione o tipo</option>
                {Object.entries(tiposDemandaGroups).map(([mainType, subTypes]) => (
                  <Fragment key={mainType}>
                    <option 
                      disabled
                      value=""
                      className="font-medium bg-slate-50 text-slate-800"
                    >
                      {getGroupIcon(mainType)} {mainType}
                    </option>
                    {subTypes.map(subType => (
                      <option 
                        key={`${mainType}::${subType}`} 
                        value={`${mainType}::${subType}`}
                        className="pl-6 text-slate-600"
                      >
                        {subType}
                      </option>
                    ))}
                  </Fragment>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status do Ofício *
            </label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none"
              >
                <option value="">Selecione o status</option>
                <option value="Em Análise">Em Análise</option>
                <option value="Protocolado">Protocolado</option>
                <option value="Concluído">Concluído</option>
                <option value="Cancelado">Cancelado</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Arquivo Atual */}
          {arquivoAtual && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Arquivo Atual
              </label>
              <div className="flex items-center gap-3">
                <a
                  href={arquivoAtual}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Ver Arquivo Protocolado
                </a>
                <button
                  onClick={() => setShowDeleteFileModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Excluir Arquivo
                </button>
              </div>
            </div>
          )}

          {/* Upload Novo Arquivo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {arquivoAtual ? 'Substituir Arquivo' : 'Adicionar Arquivo'}
            </label>
            
            {uploadFile ? (
              // Arquivo selecionado - visualização destacada
              <div className="bg-blue-50 border-2 border-blue-300 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white">
                      <FileText className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-900 mb-1">
                        {uploadFile.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-xs text-blue-600 font-medium mt-1">
                        ✓ Arquivo pronto para upload
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUploadFile(null)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 hover:bg-red-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              // Área de upload
              <div className="border-2 border-dashed border-slate-300 p-6 hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="h-10 w-10 text-slate-400 mb-3" />
                  <span className="text-sm font-medium text-slate-700">
                    Clique para selecionar um arquivo
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    PDF, DOC, DOCX, JPG, PNG (máx. 10MB)
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
            <button
              onClick={() => navigate(-1)}
              disabled={isSaving}
              className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteFileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Excluir Arquivo</h3>
                <p className="text-sm text-slate-500">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            
            <p className="text-slate-600 mb-6">
              Tem certeza que deseja excluir o arquivo protocolado deste ofício? 
              O arquivo será removido permanentemente.
            </p>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowDeleteFileModal(false)}
                disabled={isDeletingFile}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteFile}
                disabled={isDeletingFile}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingFile ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4" />
                    Excluir Arquivo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditarOficio;
