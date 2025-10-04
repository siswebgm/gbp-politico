import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ChevronLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Pencil, 
  X, 
  Search, 
  Filter, 
  ChevronDown, 
  Upload, 
  Loader2,
  LampCeiling,
  HardHat,
  Building2,
  CircleDot,
  ChevronRight,
  FileText,
  Trash2
} from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useAuth } from '../../../providers/AuthProvider';
import { formatDate, isToday } from '../../../utils/format';
import { toast } from 'react-toastify';
import { Fragment } from 'react';

interface Oficio {
  uid: string;
  numero_oficio: string;
  data_solicitacao: string;
  nivel_de_urgencia: string;
  fotos_do_problema: string[];
  status_solicitacao: string;
  tipo_de_demanda: string;
  descricao_do_problema: string;
  requerente_nome: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  created_at: string;
  visualizou: boolean;
  responsavel_nome: string;
  url_oficio_protocolado?: string;
  fd_demanda_registrada_true_false?: boolean;
}

interface ExistingOficioData {
  numero_oficio: string;
  tipo_de_demanda: string;
  status_solicitacao: string;
}

interface EditOficioData {
  uid: string;
  numero_oficio: string;
  tipo_de_demanda: string;
  status_solicitacao: string;
  url_oficio_protocolado?: string;
}

const STATUS_STYLES = {
  'Em Análise': {
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: Clock
  },
  'Protocolado': {
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: CheckCircle2
  },
  'Concluído': {
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: CheckCircle2
  },
  'Cancelado': {
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: AlertCircle
  }
};

const ListaAnualOficios: React.FC = () => {
  const navigate = useNavigate();
  const { ano } = useParams<{ ano: string }>();
  const { company } = useCompanyStore();
  const { user } = useAuth();
  const [oficios, setOficios] = useState<Oficio[]>([]);
  const [filteredOficios, setFilteredOficios] = useState<Oficio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showExistingOficioModal, setShowExistingOficioModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedTipoDemanda, setSelectedTipoDemanda] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [tiposDemanda, setTiposDemanda] = useState<string[]>([]);
  const [existingOficioData, setExistingOficioData] = useState<ExistingOficioData>({
    numero_oficio: '',
    tipo_de_demanda: '',
    status_solicitacao: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [oficioToDelete, setOficioToDelete] = useState<Oficio | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOficioData, setEditOficioData] = useState<EditOficioData>({
    uid: '',
    numero_oficio: '',
    tipo_de_demanda: '',
    status_solicitacao: '',
    url_oficio_protocolado: ''
  });
  const [editUploadFile, setEditUploadFile] = useState<File | null>(null);
  const [isEditUploading, setIsEditUploading] = useState(false);
  const itemsPerPage = 10;

  // Calcula o total de páginas
  const totalPages = Math.ceil(filteredOficios.length / itemsPerPage);

  // Obtém os itens da página atual
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredOficios.slice(startIndex, endIndex);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Reseta a página atual quando os filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchDate, selectedStatus, selectedTipoDemanda, selectedPeriod]);

  // Early return se não houver empresa
  if (!company) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-slate-500">Carregando empresa...</p>
      </div>
    );
  }

  useEffect(() => {
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
          
          // Processa todos os itens de nome_tipo de todos os registros
          data.forEach(record => {
            if (record.nome_tipo && Array.isArray(record.nome_tipo)) {
              record.nome_tipo.forEach((item: string) => {
                if (item && item.trim() !== '') {
                  // Remove espaços em branco e adiciona ao conjunto
                  tiposSet.add(item.trim());
                }
              });
            }
          });

          // Converte para array e ordena alfabeticamente
          const tiposOrdenados = Array.from(tiposSet).sort();
          setTiposDemanda(tiposOrdenados);
        } else {
          setTiposDemanda([]);
        }
      } catch (error) {
        console.error('Erro ao buscar tipos de demanda:', error);
        setTiposDemanda([]);
      }
    };

    fetchTiposDemanda();
  }, [company?.uid]);

  useEffect(() => {
    fetchOficios();
  }, [ano]);

  useEffect(() => {
    let filtered = [...oficios];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(oficio => 
        oficio.numero_oficio.toLowerCase().includes(term) ||
        oficio.tipo_de_demanda.toLowerCase().includes(term)
      );
    }

    if (searchDate) {
      const searchDateObj = new Date(searchDate);
      filtered = filtered.filter(oficio => {
        const oficioDate = new Date(oficio.data_solicitacao);
        return (
          oficioDate.getFullYear() === searchDateObj.getFullYear() &&
          oficioDate.getMonth() === searchDateObj.getMonth() &&
          oficioDate.getDate() === searchDateObj.getDate()
        );
      });
    }

    if (selectedStatus) {
      filtered = filtered.filter(oficio => oficio.status_solicitacao === selectedStatus);
    }

    if (selectedTipoDemanda) {
      filtered = filtered.filter(oficio => oficio.tipo_de_demanda === selectedTipoDemanda);
    }

    if (selectedPeriod) {
      const filterByPeriod = (oficio: Oficio) => {
        const oficioDate = new Date(oficio.data_solicitacao);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - oficioDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        switch (selectedPeriod) {
          case 'hoje':
            return isToday(oficioDate);
          case '7dias':
            return diffDays <= 7;
          case '30dias':
            return diffDays <= 30;
          case '60dias':
            return diffDays <= 60;
          default:
            return true;
        }
      };

      filtered = filtered.filter(filterByPeriod);
    }

    setFilteredOficios(filtered);
  }, [oficios, searchTerm, searchDate, selectedStatus, selectedTipoDemanda, selectedPeriod]);

  const fetchOficios = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabaseClient
        .from('gbp_oficios')
        .select('*')
        .eq('empresa_uid', company.uid)
        .filter('numero_oficio', 'ilike', `%/${ano}`)
        .not('url_oficio_protocolado', 'is', null)
        .not('url_oficio_protocolado', 'eq', '');

      if (error) throw error;

      const filteredData = (data || []).filter(oficio => 
        oficio.url_oficio_protocolado && 
        oficio.url_oficio_protocolado.trim() !== ''
      );

      setOficios(filteredData);
    } catch (error) {
      console.error('Erro ao buscar ofícios:', error);
      toast.error('Erro ao carregar os ofícios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveExistingOficio = async () => {
    try {
      setIsUploading(true);
      let publicUrl = '';

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
        const fileName = `${existingOficioData.numero_oficio}_protocolo_${timestamp}.${fileExt}`;
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

      const numeroOficioCompleto = `${existingOficioData.numero_oficio}/${ano}`;

      const { error } = await supabaseClient
        .from('gbp_oficios')
        .insert([{
          empresa_uid: company.uid,
          numero_oficio: numeroOficioCompleto,
          tipo_de_demanda: existingOficioData.tipo_de_demanda,
          status_solicitacao: existingOficioData.status_solicitacao,
          data_solicitacao: new Date().toISOString(),
          url_oficio_protocolado: publicUrl || null,
          descricao_do_problema: 'Ofício Existente', // Valor padrão
          eleitor_uid: null,
          responsavel_uid: user?.uid || null,
          responsavel_nome: user?.nome || null,
          tag: 'Ofício', // Valor padrão
          nivel_de_urgencia: 'Normal', // Valor padrão
          fd_demanda_registrada_true_false: false,
          oficio_existente: true // Marcando como ofício existente
        }]);

      if (error) throw error;

      toast.success('Ofício cadastrado com sucesso!');
      resetExistingOficioForm();
      setShowExistingOficioModal(false);
      fetchOficios();
    } catch (error) {
      console.error('Erro ao salvar ofício:', error);
      toast.error('Erro ao salvar ofício');
    } finally {
      setIsUploading(false);
    }
  };

  const resetExistingOficioForm = () => {
    setExistingOficioData({
      numero_oficio: '',
      tipo_de_demanda: '',
      status_solicitacao: ''
    });
    setUploadFile(null);
  };

  // Função para organizar os tipos de demanda em grupos
  const groupTiposDemanda = (tipos: string[]) => {
    const groups: { [key: string]: string[] } = {};
    
    // Se não houver tipos, retorna um objeto vazio
    if (!tipos || tipos.length === 0) {
      return {};
    }

    // Processa cada tipo de demanda
    tipos.forEach(tipo => {
      if (!tipo) return;
      
      // Verifica se o tipo contém '::' para separar em grupo e subgrupo
      if (tipo.includes('::')) {
        const [mainType, ...subTypes] = tipo.split('::');
        const subType = subTypes.join('::').trim();
        
        if (mainType && subType) {
          if (!groups[mainType]) {
            groups[mainType] = [];
          }
          groups[mainType].push(subType);
        }
      } else {
        // Se não tiver '::', adiciona como um grupo sem subgrupos
        if (!groups['Outros']) {
          groups['Outros'] = [];
        }
        groups['Outros'].push(tipo);
      }
    });

    // Ordena os subgrupos de cada grupo
    Object.keys(groups).forEach(group => {
      groups[group] = groups[group].sort();
    });

    return groups;
  };

  const getGroupIcon = (groupName: string) => {
    switch (groupName) {
      case 'Iluminação e Segurança':
        return <LampCeiling className="w-4 h-4" />;
      case 'Infraestrutura':
        return <HardHat className="w-4 h-4" />;
      case 'Serviços Publicos':
        return <Building2 className="w-4 h-4" />;
      default:
        return <CircleDot className="w-4 h-4" />;
    }
  };

  const tiposDemandaGroups = groupTiposDemanda(tiposDemanda);

  if (!user) {
    return null;
  }

  const handleDeleteOficio = async () => {
    if (!oficioToDelete) return;

    try {
      const { error } = await supabaseClient
        .from('gbp_oficios')
        .delete()
        .eq('uid', oficioToDelete.uid);

      if (error) throw error;

      toast.success('Ofício excluído com sucesso!');
      setShowDeleteModal(false);
      setOficioToDelete(null);
      fetchOficios();
    } catch (error) {
      console.error('Erro ao excluir ofício:', error);
      toast.error('Erro ao excluir ofício');
    }
  };

  const handleEditOficio = async () => {
    try {
      setIsEditUploading(true);
      let publicUrl = editOficioData.url_oficio_protocolado;

      if (editUploadFile) {
        const { data: empresaData, error: storageError } = await supabaseClient
          .from('gbp_empresas')
          .select('storage')
          .eq('uid', company.uid)
          .single();

        if (storageError) throw storageError;
        if (!empresaData?.storage) throw new Error('Storage da empresa não encontrado');

        const fileExt = editUploadFile.name.split('.').pop();
        const timestamp = new Date().getTime();
        const fileName = `${editOficioData.numero_oficio}_protocolo_${timestamp}.${fileExt}`;
        const filePath = `oficios/${fileName}`;

        const { error: uploadError } = await supabaseClient.storage
          .from(empresaData.storage)
          .upload(filePath, editUploadFile, {
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl: url } } = supabaseClient.storage
          .from(empresaData.storage)
          .getPublicUrl(filePath);

        publicUrl = url.replace('supabase.co', 'studio.gbppolitico.com');
      }

      const { error } = await supabaseClient
        .from('gbp_oficios')
        .update({
          tipo_de_demanda: editOficioData.tipo_de_demanda,
          status_solicitacao: editOficioData.status_solicitacao,
          url_oficio_protocolado: publicUrl
        })
        .eq('uid', editOficioData.uid);

      if (error) throw error;

      toast.success('Ofício atualizado com sucesso!');
      setShowEditModal(false);
      setEditUploadFile(null);
      fetchOficios();
    } catch (error) {
      console.error('Erro ao atualizar ofício:', error);
      toast.error('Erro ao atualizar ofício');
    } finally {
      setIsEditUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-1 sm:p-6">
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/app/documentos/oficios')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="flex items-center text-xl font-semibold text-slate-900">
                Ofícios de {ano}
                <span className="ml-2 text-sm font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {filteredOficios.length}
                </span>
              </h1>
            </div>
          </div>
          
          <button
            onClick={() => setShowExistingOficioModal(true)}
            className="hidden md:inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cadastrar Ofício Existente
          </button>
        </div>
      </div>

      <button
        onClick={() => setShowExistingOficioModal(true)}
        className="md:hidden fixed right-4 bottom-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center z-10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <div className="mx-auto mt-6">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Busca por texto */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por número ou tipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Busca por data - Desktop */}
              <div className="hidden sm:block sm:w-48">
                <div className="relative">
                  <input
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Botão de Filtros Mobile */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="sm:hidden flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                <Filter className="h-4 w-4" />
                Filtros
                <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {/* Filtros Desktop */}
              <div className="hidden sm:flex items-center gap-4">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">Período</option>
                  <option value="hoje">Hoje</option>
                  <option value="7dias">Últimos 7 dias</option>
                  <option value="30dias">Últimos 30 dias</option>
                  <option value="60dias">Últimos 60 dias</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">Status</option>
                  {Object.keys(STATUS_STYLES).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>

                <select
                  value={selectedTipoDemanda}
                  onChange={(e) => setSelectedTipoDemanda(e.target.value)}
                  className="w-full md:w-64 px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs bg-white shadow-sm hover:border-slate-400 transition-colors"
                >
                  <option value="" className="text-slate-500">Tipo de Demanda</option>
                  {Object.entries(tiposDemandaGroups).map(([categoria, demandas]) => (
                    <optgroup key={categoria} label={categoria.toUpperCase()} style={{fontSize: '0.75rem', fontWeight: 'bold'}}>
                      {demandas.map(demanda => {
                        const originalTipo = tiposDemanda.find(tipo => tipo.includes(demanda) || demanda.includes(tipo.split('::')[1] || tipo));
                        return (
                          <option key={demanda} value={originalTipo || demanda} className="py-1 px-2 hover:bg-blue-50 break-words whitespace-pre-wrap text-xs truncate" style={{width: '100%', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis'}}>{demanda}</option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {/* Filtros Mobile Expandidos */}
            {showFilters && (
              <div className="sm:hidden space-y-3 pt-3 border-t border-slate-200">
                {/* Busca por data - Mobile */}
                <div className="relative">
                  <input
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="dd/mm/aaaa"
                  />
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>

                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">Período</option>
                  <option value="hoje">Hoje</option>
                  <option value="7dias">Últimos 7 dias</option>
                  <option value="30dias">Últimos 30 dias</option>
                  <option value="60dias">Últimos 60 dias</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">Status</option>
                  {Object.keys(STATUS_STYLES).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>

                <select
                  value={selectedTipoDemanda}
                  onChange={(e) => setSelectedTipoDemanda(e.target.value)}
                  className="w-full md:w-64 px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs bg-white shadow-sm hover:border-slate-400 transition-colors"
                >
                  <option value="" className="text-slate-500">Tipo de Demanda</option>
                  {Object.entries(tiposDemandaGroups).map(([categoria, demandas]) => (
                    <optgroup key={categoria} label={categoria.toUpperCase()} style={{fontSize: '0.75rem', fontWeight: 'bold'}}>
                      {demandas.map(demanda => {
                        const originalTipo = tiposDemanda.find(tipo => tipo.includes(demanda) || demanda.includes(tipo.split('::')[1] || tipo));
                        return (
                          <option key={demanda} value={originalTipo || demanda} className="py-1 px-2 hover:bg-blue-50 break-words whitespace-pre-wrap text-xs truncate" style={{width: '100%', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis'}}>{demanda}</option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            {(selectedStatus || selectedTipoDemanda || searchTerm || searchDate || selectedPeriod) && (
              <div className="flex flex-wrap gap-2 pt-3">
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                    Busca: {searchTerm}
                    <button onClick={() => setSearchTerm('')} className="hover:text-blue-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {searchDate && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                    Data: {new Date(searchDate).toLocaleDateString()}
                    <button onClick={() => setSearchDate('')} className="hover:text-blue-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedStatus && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                    Status: {selectedStatus}
                    <button onClick={() => setSelectedStatus('')} className="hover:text-blue-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedTipoDemanda && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                    Tipo: {selectedTipoDemanda}
                    <button onClick={() => setSelectedTipoDemanda('')} className="hover:text-blue-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedPeriod && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                    Período: {selectedPeriod === 'hoje' ? 'Hoje' : `Últimos ${selectedPeriod.replace('dias', ' dias')}`}
                    <button onClick={() => setSelectedPeriod('')} className="hover:text-blue-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredOficios.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-slate-600">Nenhum ofício encontrado com os filtros selecionados.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow">
                <div className="divide-y divide-gray-200">
                  {getCurrentPageItems()
                    .sort((a, b) => {
                      const numA = parseInt(a.numero_oficio.split('/')[0]);
                      const numB = parseInt(b.numero_oficio.split('/')[0]);
                      return numB - numA;
                    })
                    .map((oficio) => (
                      <div key={oficio.uid} className="p-4 hover:bg-slate-50 transition-all border-b border-slate-100 first:rounded-t-lg last:rounded-b-lg last:border-b-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-medium text-slate-900">
                                Ofício Nº {oficio.numero_oficio}
                                {!oficio.visualizou && (
                                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                    Novo
                                  </span>
                                )}
                              </h3>
                            </div>
                            <div className="mt-1.5 flex items-center gap-1 text-sm text-slate-500">
                              <span className="inline-block w-2 h-2 rounded-full bg-slate-300"></span>
                              {oficio.tipo_de_demanda}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 mt-3 sm:mt-0">
                            <div className="flex items-center text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(oficio.data_solicitacao)}
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                              STATUS_STYLES[oficio.status_solicitacao as keyof typeof STATUS_STYLES]?.color || 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                              {oficio.status_solicitacao}
                            </span>
                            <div className="flex items-center gap-3 ml-auto sm:ml-0">
                              {oficio.url_oficio_protocolado && (
                                <a
                                  href={oficio.url_oficio_protocolado}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Arquivo
                                </a>
                              )}
                              {user?.nivel_acesso === 'admin' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditOficioData({
                                        uid: oficio.uid,
                                        numero_oficio: oficio.numero_oficio,
                                        tipo_de_demanda: oficio.tipo_de_demanda,
                                        status_solicitacao: oficio.status_solicitacao,
                                        url_oficio_protocolado: oficio.url_oficio_protocolado
                                      });
                                      setShowEditModal(true);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                    title="Editar ofício"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOficioToDelete(oficio);
                                      setShowDeleteModal(true);
                                    }}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Excluir ofício"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Paginação */}
              <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próximo
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-700">
                      Mostrando <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> até{' '}
                      <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredOficios.length)}</span> de{' '}
                      <span className="font-medium">{filteredOficios.length}</span> resultados
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Anterior</span>
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          return (
                            page === 1 ||
                            page === totalPages ||
                            Math.abs(page - currentPage) <= 1
                          );
                        })
                        .map((page, index, array) => {
                          if (index > 0 && page - array[index - 1] > 1) {
                            return (
                              <span
                                key={`ellipsis-${page}`}
                                className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300"
                              >
                                ...
                              </span>
                            );
                          }
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                currentPage === page
                                  ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                  : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Próximo</span>
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {showExistingOficioModal && (
          <div className="fixed inset-0 overflow-y-auto z-50">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" onClick={() => setShowExistingOficioModal(false)} />
              
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <h2 className="text-xl font-semibold text-slate-800">Cadastrar Ofício Existente</h2>
                  <button
                    onClick={() => setShowExistingOficioModal(false)}
                    className="text-slate-400 hover:text-slate-500 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                  {/* Número do Ofício */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Número do Ofício
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={existingOficioData.numero_oficio}
                          onChange={(e) =>
                            setExistingOficioData((prev) => ({
                              ...prev,
                              numero_oficio: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-shadow"
                          placeholder="Ex: 123"
                        />
                      </div>
                      <div className="flex items-center bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-200">
                        <span className="text-sm font-medium text-slate-600">/{ano}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tipo de Demanda */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tipo de Demanda
                    </label>
                    <div className="relative">
                      <select
                        value={existingOficioData.tipo_de_demanda}
                        onChange={(e) =>
                          setExistingOficioData((prev) => ({
                            ...prev,
                            tipo_de_demanda: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white appearance-none transition-shadow"
                      >
                        <option value="">Selecione o tipo</option>
                        {Object.entries(tiposDemandaGroups).map(([mainType, subTypes]) => (
                          <Fragment key={mainType}>
                            <option 
                              disabled
                              value=""
                              className="font-medium bg-slate-50 text-slate-800 py-2 border-t border-slate-100 first:border-t-0 cursor-default"
                            >
                              {getGroupIcon(mainType)} {mainType}
                            </option>
                            {subTypes.map(subType => (
                              <option 
                                key={`${mainType}::${subType}`} 
                                value={`${mainType}::${subType}`}
                                className="pl-6 text-slate-600 py-1.5"
                                style={{ textIndent: '1.5rem' }}
                              >
                                {subType}
                              </option>
                            ))}
                          </Fragment>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Status do Ofício */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Status do Ofício
                    </label>
                    <div className="relative">
                      <select
                        value={existingOficioData.status_solicitacao}
                        onChange={(e) =>
                          setExistingOficioData((prev) => ({
                            ...prev,
                            status_solicitacao: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white appearance-none transition-shadow"
                      >
                        <option value="">Selecione o status</option>
                        <option value="Em Análise">Em Análise</option>
                        <option value="Protocolado">Protocolado</option>
                        <option value="Concluído">Concluído</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Upload do Documento */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Documento Protocolado
                    </label>
                    <div className="mt-1 flex justify-center px-6 py-4 border-2 border-slate-200 border-dashed rounded-lg hover:border-slate-300 transition-colors">
                      <div className="text-center">
                        {uploadFile ? (
                          <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-md border border-blue-100">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <div className="flex-1 truncate text-sm text-blue-700 font-medium">
                              {uploadFile.name}
                            </div>
                            <button
                              onClick={() => setUploadFile(null)}
                              className="shrink-0 text-blue-400 hover:text-blue-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-center">
                              <Upload className="h-8 w-8 text-slate-400" />
                            </div>
                            <div className="flex text-sm text-slate-500">
                              <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                <span>Selecionar arquivo</span>
                                <input
                                  id="file-upload"
                                  type="file"
                                  className="sr-only"
                                  accept=".pdf,.doc,.docx"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setUploadFile(file);
                                  }}
                                />
                              </label>
                            </div>
                            <p className="text-xs text-slate-400">PDF, DOC ou DOCX</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 rounded-b-xl border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowExistingOficioModal(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveExistingOficio}
                    disabled={isUploading || !existingOficioData.numero_oficio || !existingOficioData.tipo_de_demanda || !existingOficioData.status_solicitacao || !uploadFile}
                    className={`
                      px-4 py-2 text-sm font-medium text-white rounded-lg transition-all
                      ${isUploading 
                        ? 'bg-blue-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    {isUploading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Salvando...</span>
                      </div>
                    ) : (
                      'Salvar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Edição */}
        {showEditModal && (
          <div className="fixed inset-0 overflow-y-auto z-50">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" onClick={() => setShowEditModal(false)} />
              
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <h2 className="text-xl font-semibold text-slate-800">Editar Ofício</h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-slate-400 hover:text-slate-500 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                  {/* Número do Ofício (Somente Leitura) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Número do Ofício
                    </label>
                    <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
                      {editOficioData.numero_oficio}
                    </div>
                  </div>

                  {/* Tipo de Demanda */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tipo de Demanda
                    </label>
                    <div className="relative">
                      <select
                        value={editOficioData.tipo_de_demanda}
                        onChange={(e) =>
                          setEditOficioData((prev) => ({
                            ...prev,
                            tipo_de_demanda: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white appearance-none transition-shadow"
                      >
                        <option value="">Selecione o tipo</option>
                        {Object.entries(tiposDemandaGroups).map(([mainType, subTypes]) => (
                          <Fragment key={mainType}>
                            <option 
                              disabled
                              value=""
                              className="font-medium bg-slate-50 text-slate-800 py-2 border-t border-slate-100 first:border-t-0 cursor-default"
                            >
                              {getGroupIcon(mainType)} {mainType}
                            </option>
                            {subTypes.map(subType => (
                              <option 
                                key={`${mainType}::${subType}`} 
                                value={`${mainType}::${subType}`}
                                className="pl-6 text-slate-600 py-1.5"
                                style={{ textIndent: '1.5rem' }}
                              >
                                {subType}
                              </option>
                            ))}
                          </Fragment>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Status do Ofício */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Status do Ofício
                    </label>
                    <div className="relative">
                      <select
                        value={editOficioData.status_solicitacao}
                        onChange={(e) =>
                          setEditOficioData((prev) => ({
                            ...prev,
                            status_solicitacao: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white appearance-none transition-shadow"
                      >
                        <option value="">Selecione o status</option>
                        <option value="Em Análise">Em Análise</option>
                        <option value="Protocolado">Protocolado</option>
                        <option value="Concluído">Concluído</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Upload do Documento */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Documento Protocolado
                    </label>
                    <div className="mt-1 flex justify-center px-6 py-4 border-2 border-slate-200 border-dashed rounded-lg hover:border-slate-300 transition-colors">
                      <div className="text-center">
                        {editUploadFile ? (
                          <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-md border border-blue-100">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <div className="flex-1 truncate text-sm text-blue-700 font-medium">
                              {editUploadFile.name}
                            </div>
                            <button
                              onClick={() => setEditUploadFile(null)}
                              className="shrink-0 text-blue-400 hover:text-blue-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : editOficioData.url_oficio_protocolado ? (
                          <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-md border border-green-100">
                            <FileText className="h-5 w-5 text-green-500" />
                            <div className="flex-1 truncate text-sm text-green-700 font-medium">
                              Arquivo atual
                            </div>
                            <a
                              href={editOficioData.url_oficio_protocolado}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-green-400 hover:text-green-500"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </a>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-center">
                              <Upload className="h-8 w-8 text-slate-400" />
                            </div>
                            <div className="flex text-sm text-slate-500">
                              <label htmlFor="edit-file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                <span>Selecionar arquivo</span>
                                <input
                                  id="edit-file-upload"
                                  type="file"
                                  className="sr-only"
                                  accept=".pdf,.doc,.docx"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) setEditUploadFile(file);
                                  }}
                                />
                              </label>
                            </div>
                            <p className="text-xs text-slate-400">PDF, DOC ou DOCX</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 rounded-b-xl border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEditOficio}
                    disabled={isEditUploading || !editOficioData.tipo_de_demanda || !editOficioData.status_solicitacao}
                    className={`
                      px-4 py-2 text-sm font-medium text-white rounded-lg transition-all
                      ${isEditUploading 
                        ? 'bg-blue-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    {isEditUploading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Salvando...</span>
                      </div>
                    ) : (
                      'Salvar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        {showDeleteModal && oficioToDelete && (
          <div className="fixed inset-0 overflow-y-auto z-50">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" onClick={() => setShowDeleteModal(false)} />
              
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <h2 className="text-xl font-semibold text-slate-800">Confirmar Exclusão</h2>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="text-slate-400 hover:text-slate-500 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  <p className="text-slate-600">
                    Tem certeza que deseja excluir o Ofício Nº {oficioToDelete.numero_oficio}?
                    <br />
                    <span className="text-sm text-slate-500">Esta ação não poderá ser desfeita.</span>
                  </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 rounded-b-xl border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteOficio}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListaAnualOficios;
