import { useEffect, useState, useCallback } from 'react';
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
  Trash2,
  Download,
  FileSpreadsheet,
  FolderInput,
  Plus,
  MoreVertical,
  Check
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [oficioToMove, setOficioToMove] = useState<Oficio | null>(null);
  const [targetYear, setTargetYear] = useState('');
  const [newYearInput, setNewYearInput] = useState('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedTipoDemanda, setSelectedTipoDemanda] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [tiposDemanda, setTiposDemanda] = useState<string[]>([]);
  const [isNovoTipoDemandaModalOpen, setIsNovoTipoDemandaModalOpen] = useState(false);
  const [novoTipoDemanda, setNovoTipoDemanda] = useState('');
  const [novaSecretaria, setNovaSecretaria] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [editingTipo, setEditingTipo] = useState<string | null>(null);
  const [editedTipoValue, setEditedTipoValue] = useState('');
  const [menuOpenForTipo, setMenuOpenForTipo] = useState<string | null>(null);
  const [showDeleteTipoModal, setShowDeleteTipoModal] = useState(false);
  const [tipoToDelete, setTipoToDelete] = useState<string | null>(null);
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
  const itemsPerPage = 9;

  // Calcula o total de páginas
  const totalPages = Math.ceil(filteredOficios.length / itemsPerPage);

  // Obtém os itens da página atual
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredOficios.slice(startIndex, endIndex);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Função para exportar um ofício individual em PDF
  const exportarOficioPDF = (oficio: Oficio) => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Ofício Nº ${oficio.numero_oficio}`, 14, 20);
    
    // Informações do ofício
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const dados = [
      ['Data de Solicitação', formatDate(oficio.data_solicitacao)],
      ['Status', oficio.status_solicitacao],
      ['Tipo de Demanda', oficio.tipo_de_demanda],
      ['Nível de Urgência', oficio.nivel_de_urgencia || '-'],
      ['Requerente', oficio.requerente_nome || '-'],
      ['Logradouro', oficio.logradouro || '-'],
      ['Bairro', oficio.bairro || '-'],
      ['Cidade', oficio.cidade || '-'],
      ['Responsável', oficio.responsavel_nome || '-'],
      ['Descrição', oficio.descricao_do_problema || '-']
    ];
    
    // Adiciona URL do ofício protocolado se existir
    if (oficio.url_oficio_protocolado) {
      dados.push(['Arquivo Protocolado', oficio.url_oficio_protocolado]);
    }
    
    // Adiciona fotos do problema se existirem
    if (oficio.fotos_do_problema && oficio.fotos_do_problema.length > 0) {
      oficio.fotos_do_problema.forEach((foto, index) => {
        dados.push([`Foto ${index + 1}`, foto]);
      });
    }
    
    (doc as any).autoTable({
      startY: 30,
      head: [['Campo', 'Valor']],
      body: dados,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 },
      columnStyles: {
        1: { cellWidth: 'auto' }
      }
    });
    
    doc.save(`Oficio_${oficio.numero_oficio.replace('/', '-')}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  // Função para exportar todos os ofícios em PDF
  const exportarTodosPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Ofícios de ${ano}`, 14, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: ${filteredOficios.length} ofícios`, 14, 28);
    
    // Preparar dados para a tabela
    const dados = filteredOficios.map(oficio => [
      oficio.numero_oficio,
      formatDate(oficio.data_solicitacao),
      oficio.tipo_de_demanda,
      oficio.status_solicitacao,
      oficio.requerente_nome || '-'
    ]);
    
    (doc as any).autoTable({
      startY: 35,
      head: [['Nº Ofício', 'Data', 'Tipo', 'Status', 'Requerente']],
      body: dados,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 }
    });
    
    doc.save(`Oficios_${ano}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  // Função para exportar um ofício individual em Excel
  const exportarOficioExcel = (oficio: Oficio) => {
    const dados = [
      { Campo: 'Número do Ofício', Valor: oficio.numero_oficio },
      { Campo: 'Data de Solicitação', Valor: formatDate(oficio.data_solicitacao) },
      { Campo: 'Status', Valor: oficio.status_solicitacao },
      { Campo: 'Tipo de Demanda', Valor: oficio.tipo_de_demanda },
      { Campo: 'Nível de Urgência', Valor: oficio.nivel_de_urgencia || '-' },
      { Campo: 'Requerente', Valor: oficio.requerente_nome || '-' },
      { Campo: 'Logradouro', Valor: oficio.logradouro || '-' },
      { Campo: 'Bairro', Valor: oficio.bairro || '-' },
      { Campo: 'Cidade', Valor: oficio.cidade || '-' },
      { Campo: 'Responsável', Valor: oficio.responsavel_nome || '-' },
      { Campo: 'Descrição', Valor: oficio.descricao_do_problema || '-' }
    ];
    
    // Adiciona URL do ofício protocolado se existir
    if (oficio.url_oficio_protocolado) {
      dados.push({ Campo: 'Arquivo Protocolado', Valor: oficio.url_oficio_protocolado });
    }
    
    // Adiciona fotos do problema se existirem
    if (oficio.fotos_do_problema && oficio.fotos_do_problema.length > 0) {
      oficio.fotos_do_problema.forEach((foto, index) => {
        dados.push({ Campo: `Foto ${index + 1}`, Valor: foto });
      });
    }
    
    const ws = XLSX.utils.json_to_sheet(dados);
    
    // Ajustar largura das colunas
    const maxWidthCampo = Math.max(...dados.map(d => d.Campo.length));
    const maxWidthValor = Math.max(...dados.map(d => String(d.Valor).length));
    
    ws['!cols'] = [
      { wch: Math.min(maxWidthCampo + 2, 30) },
      { wch: Math.min(maxWidthValor + 2, 100) }
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ofício');
    
    XLSX.writeFile(wb, `Oficio_${oficio.numero_oficio.replace('/', '-')}.xlsx`);
    toast.success('Excel gerado com sucesso!');
  };

  // Função para exportar todos os ofícios em Excel
  const exportarTodosExcel = () => {
    const dados = filteredOficios.map(oficio => ({
      'Nº Ofício': oficio.numero_oficio,
      'Data': formatDate(oficio.data_solicitacao),
      'Tipo de Demanda': oficio.tipo_de_demanda,
      'Status': oficio.status_solicitacao,
      'Urgência': oficio.nivel_de_urgencia || '-',
      'Requerente': oficio.requerente_nome || '-',
      'Logradouro': oficio.logradouro || '-',
      'Bairro': oficio.bairro || '-',
      'Cidade': oficio.cidade || '-',
      'Responsável': oficio.responsavel_nome || '-',
      'Descrição': oficio.descricao_do_problema || '-',
      'Arquivo Protocolado': oficio.url_oficio_protocolado || '-',
      'Fotos do Problema': oficio.fotos_do_problema && oficio.fotos_do_problema.length > 0 
        ? oficio.fotos_do_problema.join(' | ') 
        : '-'
    }));
    
    const ws = XLSX.utils.json_to_sheet(dados);
    
    // Ajustar largura das colunas automaticamente
    const colWidths = [
      { wch: 12 },  // Nº Ofício
      { wch: 12 },  // Data
      { wch: 25 },  // Tipo de Demanda
      { wch: 12 },  // Status
      { wch: 10 },  // Urgência
      { wch: 25 },  // Requerente
      { wch: 30 },  // Logradouro
      { wch: 20 },  // Bairro
      { wch: 20 },  // Cidade
      { wch: 25 },  // Responsável
      { wch: 40 },  // Descrição
      { wch: 50 },  // Arquivo Protocolado
      { wch: 60 }   // Fotos do Problema
    ];
    
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Ofícios ${ano}`);
    
    XLSX.writeFile(wb, `Oficios_${ano}.xlsx`);
    toast.success('Excel gerado com sucesso!');
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
      if (!company?.uid || !ano) return;

      try {
        const tiposSet = new Set<string>();

        // 1. Tipos usados em ofícios do ano
        const { data: oficiosData, error: oficiosError } = await supabaseClient
          .from('gbp_oficios')
          .select('tipo_de_demanda')
          .eq('empresa_uid', company.uid)
          .filter('numero_oficio', 'ilike', `%/${ano}`)
          .not('tipo_de_demanda', 'is', null);

        if (oficiosError) {
          console.error('Erro ao carregar tipos de ofícios:', oficiosError);
        } else if (oficiosData) {
          oficiosData.forEach(d => { if (d.tipo_de_demanda) tiposSet.add(d.tipo_de_demanda); });
        }

        // 2. Tipos cadastrados em gbp_demanda_tipo (inclui os criados via modal)
        const { data: configData, error: configError } = await supabaseClient
          .from('gbp_demanda_tipo')
          .select('nome_tipo')
          .eq('empresa_uid', company.uid)
          .single();

        if (configError && configError.code !== 'PGRST116') {
          console.error('Erro ao carregar tipos cadastrados:', configError);
        } else if (configData?.nome_tipo && Array.isArray(configData.nome_tipo)) {
          configData.nome_tipo.forEach((t: string) => { if (t) tiposSet.add(t); });
        }

        setTiposDemanda(Array.from(tiposSet).sort());
      } catch (error) {
        console.error('Erro ao buscar tipos de demanda:', error);
        setTiposDemanda([]);
      }
    };

    fetchTiposDemanda();
  }, [company?.uid, ano]);

  const handleAddNovoTipoDemanda = async () => {
    if (!novoTipoDemanda.trim()) {
      toast.error('Preencha o tipo de demanda');
      return;
    }

    try {
      // Buscar registro existente da empresa
      const { data: existingData, error: fetchError } = await supabaseClient
        .from('gbp_demanda_tipo')
        .select('nome_tipo')
        .eq('empresa_uid', company.uid)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let novosTipos: string[] = [];
      
      if (existingData && existingData.nome_tipo) {
        // Adiciona novo tipo ao array existente
        novosTipos = [...(existingData.nome_tipo as string[]), novoTipoDemanda.trim()];
        
        // Atualiza registro existente
        const { error: updateError } = await supabaseClient
          .from('gbp_demanda_tipo')
          .update({ nome_tipo: novosTipos })
          .eq('empresa_uid', company.uid);

        if (updateError) throw updateError;
      } else {
        // Cria novo registro
        novosTipos = [novoTipoDemanda.trim()];
        
        const { error: insertError } = await supabaseClient
          .from('gbp_demanda_tipo')
          .insert({
            empresa_uid: company.uid,
            nome_tipo: novosTipos
          });

        if (insertError) throw insertError;
      }

      // Atualiza estado local
      setTiposDemanda([...tiposDemanda, novoTipoDemanda.trim()].sort());
      
      // Limpa campos
      setNovoTipoDemanda('');
      
      toast.success('Tipo de demanda adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar tipo de demanda:', error);
      toast.error('Erro ao adicionar tipo de demanda');
    }
  };

  const handleDeleteTipoDemanda = async (tipoToDelete: string) => {
    try {
      // Buscar registro existente da empresa
      const { data: existingData, error: fetchError } = await supabaseClient
        .from('gbp_demanda_tipo')
        .select('nome_tipo')
        .eq('empresa_uid', company.uid)
        .single();

      if (fetchError || !existingData || !existingData.nome_tipo) {
        throw fetchError || new Error('Registro não encontrado');
      }

      // Remove o tipo do array
      const tiposAtualizados = (existingData.nome_tipo as string[]).filter(t => t !== tipoToDelete);
      
      // Atualiza registro
      const { error: updateError } = await supabaseClient
        .from('gbp_demanda_tipo')
        .update({ nome_tipo: tiposAtualizados })
        .eq('empresa_uid', company.uid);

      if (updateError) throw updateError;

      // Atualiza estado local
      setTiposDemanda(tiposAtualizados.sort());
      setShowDeleteTipoModal(false);
      setTipoToDelete(null);
      
      toast.success('Tipo de demanda excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir tipo de demanda:', error);
      toast.error('Erro ao excluir tipo de demanda');
    }
  };

  const confirmDeleteTipo = (tipo: string) => {
    setTipoToDelete(tipo);
    setShowDeleteTipoModal(true);
    setMenuOpenForTipo(null);
  };

  const handleEditTipoDemanda = async (originalTipo: string, newTipo: string) => {
    if (!newTipo.trim()) {
      toast.error('O tipo de demanda não pode estar vazio');
      return;
    }

    try {
      // Buscar registro existente da empresa
      const { data: existingData, error: fetchError } = await supabaseClient
        .from('gbp_demanda_tipo')
        .select('nome_tipo')
        .eq('empresa_uid', company.uid)
        .single();

      if (fetchError || !existingData || !existingData.nome_tipo) {
        throw fetchError || new Error('Registro não encontrado');
      }

      // Substitui o tipo antigo pelo novo
      const tiposAtualizados = (existingData.nome_tipo as string[]).map(t => 
        t === originalTipo ? newTipo.trim() : t
      );
      
      // Atualiza registro
      const { error: updateError } = await supabaseClient
        .from('gbp_demanda_tipo')
        .update({ nome_tipo: tiposAtualizados })
        .eq('empresa_uid', company.uid);

      if (updateError) throw updateError;

      // Atualiza estado local
      setTiposDemanda(tiposAtualizados.sort());
      setEditingTipo(null);
      setEditedTipoValue('');
      
      toast.success('Tipo de demanda atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao editar tipo de demanda:', error);
      toast.error('Erro ao editar tipo de demanda');
    }
  };

  const startEditingTipo = (tipo: string) => {
    setEditingTipo(tipo);
    setEditedTipoValue(tipo);
  };

  const cancelEditingTipo = () => {
    setEditingTipo(null);
    setEditedTipoValue('');
  };

  // Função para buscar nome personalizado da pasta
  const getFolderName = (year: string) => {
    if (!year) return '';
    const customName = localStorage.getItem(`folder_name_${year}`);
    return customName || year;
  };

  // Buscar anos disponíveis
  const fetchAvailableYears = useCallback(async () => {
    if (!company?.uid) return;
    
    try {
      const { data, error } = await supabaseClient
        .from('gbp_oficios')
        .select('numero_oficio')
        .eq('empresa_uid', company.uid);

      if (error) throw error;

      const years = new Set<string>();
      data?.forEach(oficio => {
        const year = oficio.numero_oficio.split('/')[1];
        if (year) years.add(year);
      });

      setAvailableYears(Array.from(years).sort((a, b) => Number(b) - Number(a)));
    } catch (error) {
      console.error('Erro ao buscar anos:', error);
    }
  }, [company?.uid]);

  // Buscar ofícios
  const fetchOficios = useCallback(async () => {
    if (!company?.uid || !ano) return;
    
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
  }, [company?.uid, ano]);

  useEffect(() => {
    if (company?.uid && ano) {
      fetchOficios();
      fetchAvailableYears();
    }
  }, [company?.uid, ano, fetchOficios, fetchAvailableYears]);

  // Função para mover ofício
  const handleMoveOficio = async () => {
    if (!oficioToMove || !targetYear) return;

    try {
      const currentNumber = oficioToMove.numero_oficio.split('/')[0];
      const yearToMove = targetYear === 'novo' ? newYearInput : targetYear;
      
      if (!yearToMove) {
        toast.error('Por favor, digite o ano da nova pasta');
        return;
      }

      const newNumeroOficio = `${currentNumber}/${yearToMove}`;

      const { error } = await supabaseClient
        .from('gbp_oficios')
        .update({ numero_oficio: newNumeroOficio })
        .eq('uid', oficioToMove.uid);

      if (error) throw error;

      toast.success(`Ofício movido para ${yearToMove} com sucesso!`);
      setShowMoveModal(false);
      setOficioToMove(null);
      setTargetYear('');
      setNewYearInput('');
      fetchOficios();
    } catch (error) {
      console.error('Erro ao mover ofício:', error);
      toast.error('Erro ao mover ofício');
    }
  };

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
      }
      // Removido: não adiciona tipos sem '::' ao grupo 'Outros'
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
    <div className="min-h-screen bg-gray-50 p-1 sm:p-6 flex flex-col">
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
          
          <div className="flex items-center gap-3">
            {/* Botão Novo Ofício */}
            <button
              onClick={() => setShowExistingOficioModal(true)}
              className="hidden md:inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Novo Ofício
            </button>

            {/* Menu com 3 pontinhos */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Mais opções"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {/* Novo Tipo de Demanda */}
                  <button
                    onClick={() => {
                      setIsNovoTipoDemandaModalOpen(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="h-4 w-4 text-green-600" />
                    <span>Novo Tipo de Demanda</span>
                  </button>

                  <div className="border-t border-gray-200 my-1"></div>

                  {/* Exportar PDF */}
                  <button
                    onClick={() => {
                      exportarTodosPDF();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Download className="h-4 w-4 text-red-600" />
                    <span>Exportar PDF</span>
                  </button>

                  {/* Exportar Excel */}
                  <button
                    onClick={() => {
                      exportarTodosExcel();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <span>Exportar Excel</span>
                  </button>
                </div>
              )}
            </div>
          </div>
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

      <div className="mt-6 flex-grow flex flex-col">
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
                  {tiposDemanda.filter(t => !t.includes('::')).map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
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
                  {tiposDemanda.filter(t => !t.includes('::')).map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
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
              <div className="flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {getCurrentPageItems()
                    .sort((a, b) => {
                      const numA = parseInt(a.numero_oficio.split('/')[0]);
                      const numB = parseInt(b.numero_oficio.split('/')[0]);
                      return numB - numA;
                    })
                    .map((oficio) => {
                      const StatusIcon = STATUS_STYLES[oficio.status_solicitacao as keyof typeof STATUS_STYLES]?.icon || CircleDot;
                      return (
                        <div 
                          key={oficio.uid} 
                          className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-300 hover:-translate-y-1"
                        >
                          {/* Header do Card */}
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md flex-shrink-0">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                                  Of. Nº {oficio.numero_oficio}
                                </h3>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(oficio.data_solicitacao)}
                                </p>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border flex-shrink-0 ${
                              STATUS_STYLES[oficio.status_solicitacao as keyof typeof STATUS_STYLES]?.color || 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {oficio.status_solicitacao}
                            </div>
                          </div>

                          {/* Tipo de Demanda */}
                          <div className="mb-4 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex-shrink-0">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-500 font-medium">Tipo de Demanda</p>
                                <p className="text-sm font-semibold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">{oficio.tipo_de_demanda}</p>
                              </div>
                            </div>
                          </div>

                          {/* Footer com Ações */}
                          <div className="flex flex-col gap-3">
                            {/* Linha: Ver Arquivo e Excluir */}
                            <div className="flex items-center gap-2">
                              {/* Botão Ver Arquivo */}
                              {oficio.url_oficio_protocolado ? (
                                <a
                                  href={oficio.url_oficio_protocolado}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-lg transition-all duration-200"
                                >
                                  <FileText className="h-4 w-4" />
                                  Ver Arquivo
                                </a>
                              ) : (
                                <div className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded-lg cursor-not-allowed">
                                  <FileText className="h-4 w-4" />
                                  Sem Arquivo
                                </div>
                              )}

                              {/* Botão Excluir (Admin) */}
                              {user?.nivel_acesso === 'admin' && (
                                <button
                                  onClick={() => {
                                    setOficioToDelete(oficio);
                                    setShowDeleteModal(true);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-lg transition-all duration-200 whitespace-nowrap"
                                  title="Excluir ofício"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Excluir
                                </button>
                              )}
                            </div>

                            {/* Grid de Ícones de Ação */}
                            <div className="grid grid-cols-4 gap-2">
                              {/* Botão Download PDF */}
                              <button
                                onClick={() => exportarOficioPDF(oficio)}
                                className="flex flex-col items-center justify-center gap-1 p-2.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:shadow-sm border border-transparent hover:border-red-200"
                                title="Baixar PDF"
                              >
                                <Download className="h-5 w-5" />
                                <span className="text-xs font-medium">PDF</span>
                              </button>

                              {/* Botão Download Excel */}
                              <button
                                onClick={() => exportarOficioExcel(oficio)}
                                className="flex flex-col items-center justify-center gap-1 p-2.5 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 hover:shadow-sm border border-transparent hover:border-green-200"
                                title="Baixar Excel"
                              >
                                <FileSpreadsheet className="h-5 w-5" />
                                <span className="text-xs font-medium">Excel</span>
                              </button>

                              {/* Botão Mover */}
                              <button
                                onClick={() => {
                                  setOficioToMove(oficio);
                                  setShowMoveModal(true);
                                }}
                                className="flex flex-col items-center justify-center gap-1 p-2.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200 hover:shadow-sm border border-transparent hover:border-purple-200"
                                title="Mover para outra pasta"
                              >
                                <FolderInput className="h-5 w-5" />
                                <span className="text-xs font-medium">Mover</span>
                              </button>

                              {/* Botão Editar (Admin) */}
                              {user?.nivel_acesso === 'admin' ? (
                                <button
                                  onClick={() => navigate(`/app/documentos/oficios/editar/${oficio.uid}`)}
                                  className="flex flex-col items-center justify-center gap-1 p-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:shadow-sm border border-transparent hover:border-blue-200"
                                  title="Editar ofício"
                                >
                                  <Pencil className="h-5 w-5" />
                                  <span className="text-xs font-medium">Editar</span>
                                </button>
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-1 p-2.5 text-slate-300 bg-slate-50 rounded-lg cursor-not-allowed border border-slate-200">
                                  <Pencil className="h-5 w-5" />
                                  <span className="text-xs font-medium">Editar</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Paginação */}
        {!isLoading && filteredOficios.length > 0 && (
          <div className="mt-8 flex items-center justify-between py-4 px-2 bg-white rounded-lg shadow">
            <div>
              <p className="text-xs text-slate-500">
                Mostrando <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> até{' '}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredOficios.length)}</span> de{' '}
                <span className="font-medium">{filteredOficios.length}</span> resultados
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Página anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Próxima página"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
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
                              {mainType}
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
                        {tiposDemanda.filter(t => !t.includes('::')).map(tipo => (
                          <option key={tipo} value={tipo}>{tipo}</option>
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
                              {mainType}
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

        {/* Modal de Mover Ofício */}
        {showMoveModal && oficioToMove && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100">
                  <FolderInput className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">Mover Ofício</h2>
                  <p className="text-sm text-slate-500">Ofício Nº {oficioToMove.numero_oficio}</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Selecione a pasta de destino:
                </label>
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Selecione um ano...</option>
                  {availableYears
                    .filter(year => year !== ano)
                    .sort((a, b) => {
                      const nameA = getFolderName(a).toLowerCase();
                      const nameB = getFolderName(b).toLowerCase();
                      return nameA.localeCompare(nameB); // Ordenar A-Z
                    })
                    .map(year => (
                      <option key={year} value={year}>
                        {getFolderName(year)}
                      </option>
                    ))}
                  <option value="novo">+ Criar nova pasta</option>
                </select>

                {targetYear === 'novo' && (
                  <input
                    type="text"
                    value={newYearInput}
                    placeholder="Digite o ano (ex: 2026)"
                    onChange={(e) => setNewYearInput(e.target.value)}
                    autoFocus
                    className="w-full mt-3 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                )}
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-purple-800">
                  <strong>Atenção:</strong> O ofício será movido de <strong>{getFolderName(ano)}</strong> para <strong>{targetYear === 'novo' ? (newYearInput || '...') : (targetYear ? getFolderName(targetYear) : '...')}</strong>
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                    setOficioToMove(null);
                    setTargetYear('');
                    setNewYearInput('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleMoveOficio}
                  disabled={!targetYear || (targetYear === 'novo' && !newYearInput)}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mover Ofício
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Novo Tipo de Demanda */}
        {isNovoTipoDemandaModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Gerenciar Tipos de Demanda
                </h3>
                <button
                  onClick={() => {
                    setIsNovoTipoDemandaModalOpen(false);
                    setNovoTipoDemanda('');
                  }}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Formulário para adicionar novo tipo */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Adicionar Novo Tipo de Demanda
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={novoTipoDemanda}
                    onChange={(e) => setNovoTipoDemanda(e.target.value)}
                    placeholder="Ex: Buraco na rua, Iluminação pública..."
                    className="flex-1 min-w-0 rounded-md border border-gray-300 p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddNovoTipoDemanda();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddNovoTipoDemanda}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Lista de tipos cadastrados */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Tipos Cadastrados ({tiposDemanda.length})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {tiposDemanda.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      Nenhum tipo de demanda cadastrado
                    </p>
                  ) : (
                    tiposDemanda.map((tipo) => (
                      <div
                        key={tipo}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        {editingTipo === tipo ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editedTipoValue}
                              onChange={(e) => setEditedTipoValue(e.target.value)}
                              className="flex-1 rounded-md border border-gray-300 p-2 text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditTipoDemanda(tipo, editedTipoValue);
                                }
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditTipoDemanda(tipo, editedTipoValue)}
                              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                              title="Salvar"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEditingTipo}
                              className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                              title="Cancelar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                              {tipo}
                            </span>
                            <div className="relative">
                              <button
                                onClick={() => setMenuOpenForTipo(menuOpenForTipo === tipo ? null : tipo)}
                                className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                title="Mais opções"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {menuOpenForTipo === tipo && (
                                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                                  <button
                                    onClick={() => {
                                      startEditingTipo(tipo);
                                      setMenuOpenForTipo(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    <Pencil className="h-4 w-4 text-blue-600" />
                                    <span>Editar</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      confirmDeleteTipo(tipo);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Excluir</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setIsNovoTipoDemandaModalOpen(false);
                    setNovoTipoDemanda('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão de Tipo de Demanda */}
        {showDeleteTipoModal && tipoToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Confirmar Exclusão
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Tem certeza que deseja excluir este tipo de demanda?
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tipoToDelete}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteTipoModal(false);
                    setTipoToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteTipoDemanda(tipoToDelete)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default ListaAnualOficios;
