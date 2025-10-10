import { Container, Button, IconButton, Tooltip, Dialog } from '@mui/material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Filter, FileSpreadsheet, FileText, ArrowLeft, X, Search, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';
import { AttendanceFilters, AttendanceFilters as IAttendanceFilters } from './components/AttendanceFilters';
import { useAtendimentos } from '../../hooks/useAtendimentos';
import { useCompanyStore } from '../../store/useCompanyStore';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { AttendanceTable } from './components/AttendanceTable';
import { useNavigate } from 'react-router-dom';

type AtendimentoStatus = 'Pendente' | 'Em Andamento' | 'Concluído';

export function AttendanceList() {
  const { company } = useCompanyStore();
  const navigate = useNavigate();

  // Espera os dados da empresa estarem carregados
  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }
  const { data: atendimentos = [], isLoading } = useAtendimentos();
  const { user } = useAuth();
  
  // Get user from localStorage as fallback
  const localStorageUser = localStorage.getItem('gbp_user');
  const currentUser = user || (localStorageUser ? JSON.parse(localStorageUser) : null);
  
  // Verificação estrita de permissão de admin
  const hasAdminAccess = currentUser?.nivel_acesso === 'admin';
  
  // Debug logs
  console.log('[DEBUG] User object:', currentUser);
  console.log('[DEBUG] User cargo:', currentUser?.cargo);
  console.log('[DEBUG] User nivel_acesso:', currentUser?.nivel_acesso);
  console.log('[DEBUG] Has admin access:', hasAdminAccess);

  const handleExportExcel = () => {
    console.log('Dados para exportação:', filteredAtendimentos);
    const data = filteredAtendimentos.map(atendimento => ({
      'Descrição': atendimento.descricao || '-',
      'Data do Atendimento': atendimento.data_atendimento ? new Date(atendimento.data_atendimento).toLocaleDateString('pt-BR') : '-',
      'Responsável': atendimento.gbp_usuarios?.nome || '-',
      'Indicado por': atendimento.indicado || '-',
      'Categoria': atendimento.gbp_categorias?.nome || '-',
      'Status': atendimento.status || '-',
      'Eleitor': atendimento.gbp_eleitores?.nome || atendimento.eleitor || '-',
      'CPF': atendimento.cpf || '-',
      'Número do SUS': atendimento.numero_do_sus || '-',
      'WhatsApp': atendimento.whatsapp || '-',
      'Logradouro': atendimento.logradouro || '-',
      'Bairro': atendimento.bairro || '-',
      'Cidade': atendimento.cidade || '-',
      'UF': atendimento.uf || '-',
      'CEP': atendimento.cep || '-'
    }));

    // Criar planilha
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Ajustar largura das colunas
    const maxWidth = Object.keys(data[0] || {}).reduce((acc, key) => {
      const maxLength = Math.max(
        key.length,
        ...data.map(row => String(row[key] || '').length)
      );
      acc[key] = maxLength + 2; // +2 para dar um espaço extra
      return acc;
    }, {} as { [key: string]: number });

    worksheet['!cols'] = Object.values(maxWidth).map(width => ({ width }));

    // Adicionar filtros
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    worksheet['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(range.e.c)}1` };

    // Criar e salvar workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Atendimentos');
    XLSX.writeFile(workbook, `atendimentos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF();
    // Cabeçalho com nome do sistema
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128); // Cinza
    doc.text('GBP Político', 15, 10);

    // Data e hora atual no canto superior direito
    const now = new Date();
    const dataHora = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
    doc.text(dataHora, 195, 10, { align: 'right' });

    // Título do relatório
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0); // Preto
    doc.text('Relatório de Atendimentos', 105, 20, { align: 'center' });
    
    let yPos = 35;
    
    filteredAtendimentos.forEach((atendimento, index) => {
      // Adiciona uma nova página se não houver espaço suficiente
      if (yPos > 250) {
        // Adiciona rodapé na página atual
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(128, 128, 128);
        doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, 105, 290, { align: 'center' });
        
        // Nova página
        doc.addPage();
        yPos = 35;

        // Adiciona cabeçalho na nova página
        doc.setFontSize(10);
        doc.text('GBP Político', 15, 10);
        doc.text(dataHora, 195, 10, { align: 'right' });
      }

      const dataAtendimento = atendimento.data_atendimento 
        ? new Date(atendimento.data_atendimento).toLocaleDateString('pt-BR')
        : '-';

      // Cabeçalho do atendimento
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(0, 87, 231);
      doc.setTextColor(255, 255, 255);
      doc.rect(10, yPos - 5, 190, 8, 'F');
      doc.text(`Atendimento ${index + 1}`, 15, yPos);
      
      // Dados do atendimento
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      yPos += 10;

      const dados = [
        ['Eleitor:', atendimento.eleitor || '-', 'WhatsApp:', atendimento.whatsapp || '-'],
        ['CPF:', atendimento.cpf || '-', 'Número do SUS:', atendimento.numero_do_sus || '-'],
        ['Cidade:', atendimento.cidade || '-', 'Bairro:', atendimento.bairro || '-'],
        ['Logradouro:', atendimento.logradouro || '-', 'CEP:', atendimento.cep || '-'],
        ['Categoria:', atendimento.gbp_categorias?.nome || '-', 'Status:', atendimento.status || '-'],
        ['Responsável:', atendimento.gbp_usuarios?.nome || '-', 'Indicado por:', atendimento.indicado || '-'],
        ['Data do Atendimento:', dataAtendimento, '', '']
      ];

      dados.forEach(([label1, value1, label2, value2]) => {
        // Coluna 1
        doc.setFont('helvetica', 'bold');
        doc.text(label1, 15, yPos);
        doc.setFont('helvetica', 'normal');
        const valueWidth1 = doc.getTextWidth(value1);
        doc.text(value1, 60, yPos);

        // Coluna 2 - só se houver
        if (label2) {
          doc.setFont('helvetica', 'bold');
          doc.text(label2, 120, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(value2, 165, yPos);
        }

        yPos += 7;
      });

      // Descrição
      if (atendimento.descricao) {
        yPos += 3;
        doc.setFont('helvetica', 'bold');
        doc.text('Descrição:', 15, yPos);
        doc.setFont('helvetica', 'normal');
        
        const descricaoLines = doc.splitTextToSize(atendimento.descricao, 170);
        descricaoLines.forEach(line => {
          yPos += 5;
          doc.text(line, 15, yPos);
        });
      }

      // Linha divisória entre atendimentos
      yPos += 10;
      doc.setDrawColor(200, 200, 200);
      doc.line(10, yPos - 5, 200, yPos - 5);
      yPos += 10;
    });

    // Adiciona rodapé na última página
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, 105, 290, { align: 'center' });

    doc.save(`atendimentos_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  const [statusFilter, setStatusFilter] = useState<AtendimentoStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<IAttendanceFilters>({});
  const [quickSearch, setQuickSearch] = useState('');
  const [quickPeriod, setQuickPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Função para calcular tempo decorrido
  const calculateElapsedTime = (dataAtendimento: string) => {
    const agora = new Date();
    const data = new Date(dataAtendimento);
    const diffMs = agora.getTime() - data.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDias === 0) return 'Hoje';
    if (diffDias === 1) return '1 dia';
    if (diffDias < 7) return `${diffDias} dias`;
    if (diffDias < 30) {
      const semanas = Math.floor(diffDias / 7);
      return semanas === 1 ? '1 semana' : `${semanas} semanas`;
    }
    if (diffDias < 365) {
      const meses = Math.floor(diffDias / 30);
      return meses === 1 ? '1 mês' : `${meses} meses`;
    }
    const anos = Math.floor(diffDias / 365);
    return anos === 1 ? '1 ano' : `${anos} anos`;
  };

  // Função para verificar se o texto contém o filtro (case insensitive)
  const matchesText = (text: string | undefined | null, filter: string) => {
    if (!filter) return true;
    if (!text) return false;
    return text.toLowerCase().includes(filter.toLowerCase());
  };

  // Função para verificar se a data está no intervalo
  const matchesDate = (date: string | undefined | null, start: string | undefined, end: string | undefined) => {
    if (!date) return true;
    if (!start && !end) return true;
    
    // Normalizar datas para comparar apenas dia/mês/ano (ignorando horas)
    const dataAtendimento = new Date(date);
    dataAtendimento.setHours(0, 0, 0, 0);
    
    if (start) {
      const dataInicio = new Date(start);
      dataInicio.setHours(0, 0, 0, 0);
      if (dataAtendimento < dataInicio) return false;
    }
    if (end) {
      const dataFim = new Date(end);
      dataFim.setHours(23, 59, 59, 999); // Incluir todo o dia final
      if (dataAtendimento > dataFim) return false;
    }
    return true;
  };

  const filteredAtendimentos = atendimentos.filter(atendimento => {
    // Filtro de busca rápida
    if (quickSearch) {
      const searchLower = quickSearch.toLowerCase();
      const matchesSearch = 
        atendimento.eleitor?.toLowerCase().includes(searchLower) ||
        atendimento.gbp_eleitores?.nome?.toLowerCase().includes(searchLower) ||
        atendimento.descricao?.toLowerCase().includes(searchLower) ||
        atendimento.gbp_categorias?.nome?.toLowerCase().includes(searchLower) ||
        atendimento.cidade?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Filtro de período rápido
    if (quickPeriod !== 'all' && atendimento.data_atendimento) {
      const agora = new Date();
      const data = new Date(atendimento.data_atendimento);
      const diffDias = Math.floor((agora.getTime() - data.getTime()) / (1000 * 60 * 60 * 24));
      
      if (quickPeriod === 'today' && diffDias > 0) return false;
      if (quickPeriod === 'week' && diffDias > 7) return false;
      if (quickPeriod === 'month' && diffDias > 30) return false;
    }
    // Filtros de texto - só aplica se o filtro não estiver vazio
    if (filters.cidade && !matchesText(atendimento.cidade, filters.cidade)) return false;
    if (filters.bairro && !matchesText(atendimento.bairro, filters.bairro)) return false;
    if (filters.logradouro && !matchesText(atendimento.logradouro, filters.logradouro)) return false;
    if (filters.indicado && !matchesText(atendimento.indicado, filters.indicado)) return false;
    if (filters.responsavel && !matchesText(atendimento.gbp_usuarios?.nome, filters.responsavel)) return false;

    // Filtro de categoria e tipo de categoria - só aplica se os filtros não estiverem vazios
    if (filters.categoriaTipo && !matchesText(atendimento.gbp_categorias?.tipo?.nome, filters.categoriaTipo)) return false;
    if (filters.categoria && !matchesText(atendimento.gbp_categorias?.nome, filters.categoria)) return false;

    // Filtro de status - só aplica se houver um status selecionado
    if (statusFilter && statusFilter !== 'all' && atendimento.status !== statusFilter) return false;

    // Filtros de data - só aplica se as datas estiverem preenchidas
    if ((filters.dataInicio || filters.dataFim) && !matchesDate(atendimento.data_atendimento, filters.dataInicio, filters.dataFim)) return false;

    return true;
  });

  const statusCounts = {
    total: atendimentos.length,
    pendentes: atendimentos.filter(a => a.status === 'Pendente').length,
    emAndamento: atendimentos.filter(a => a.status === 'Em Andamento').length,
    concluidos: atendimentos.filter(a => a.status === 'Concluído').length
  };

  return (
    <div className="bg-white dark:bg-gray-800 py-6">
      <Container maxWidth={false}>
        <div className="space-y-3 sm:space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate('/app')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold dark:text-white">Atendimentos</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="hidden sm:inline">Gerencie todos os atendimentos em um só lugar</span>
                    <span className="sm:hidden">Gerencie seus atendimentos</span>
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Filter className="w-4 h-4" />}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  Filtros
                </Button>

                {hasAdminAccess && (
                  <div className="hidden md:flex gap-2">
                    <Tooltip title="Exportar para Excel">
                      <span>
                        <IconButton 
                          onClick={handleExportExcel} 
                          className="text-green-600 hover:text-green-700"
                        >
                          <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Exportar para PDF">
                      <span>
                        <IconButton 
                          onClick={handleExportPDF} 
                          className="text-red-600 hover:text-red-700"
                        >
                          <FileText className="w-5 h-5 text-red-600" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
          </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 cursor-pointer">
          <div 
            onClick={() => setStatusFilter('all')} 
            className={`bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${statusFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="flex items-center">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Total</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-semibold mt-0.5 sm:mt-1 lg:mt-2">{statusCounts.total}</p>
              </div>
              <div className="flex-shrink-0 ml-1 sm:ml-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className="mt-2 sm:mt-3 lg:mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 sm:h-1.5 lg:h-2">
              <div className="bg-blue-600 h-1 sm:h-1.5 lg:h-2 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter('Pendente')} 
            className={`bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${statusFilter === 'Pendente' ? 'ring-2 ring-yellow-500' : ''}`}
          >
            <div className="flex items-center">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Pendentes</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-semibold mt-0.5 sm:mt-1 lg:mt-2">{statusCounts.pendentes}</p>
              </div>
              <div className="flex-shrink-0 ml-1 sm:ml-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>
            <div className="mt-2 sm:mt-3 lg:mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 sm:h-1.5 lg:h-2">
              <div className="bg-yellow-600 h-1 sm:h-1.5 lg:h-2 rounded-full" style={{ width: `${(statusCounts.pendentes / statusCounts.total) * 100}%` }} />
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter('Em Andamento')} 
            className={`bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${statusFilter === 'Em Andamento' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="flex items-center">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Em Andamento</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-semibold mt-0.5 sm:mt-1 lg:mt-2">{statusCounts.emAndamento}</p>
              </div>
              <div className="flex-shrink-0 ml-1 sm:ml-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className="mt-2 sm:mt-3 lg:mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 sm:h-1.5 lg:h-2">
              <div className="bg-blue-600 h-1 sm:h-1.5 lg:h-2 rounded-full" style={{ width: `${(statusCounts.emAndamento / statusCounts.total) * 100}%` }} />
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter('Concluído')} 
            className={`bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${statusFilter === 'Concluído' ? 'ring-2 ring-green-500' : ''}`}
          >
            <div className="flex items-center">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Concluídos</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-semibold mt-0.5 sm:mt-1 lg:mt-2">{statusCounts.concluidos}</p>
              </div>
              <div className="flex-shrink-0 ml-1 sm:ml-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            <div className="mt-2 sm:mt-3 lg:mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 sm:h-1.5 lg:h-2">
              <div className="bg-green-600 h-1 sm:h-1.5 lg:h-2 rounded-full" style={{ width: `${(statusCounts.concluidos / statusCounts.total) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Filtros Rápidos */}
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Busca Rápida */}
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por eleitor, categoria, cidade..."
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {quickSearch && (
                  <button
                    onClick={() => setQuickSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtro de Período */}
            <div className="grid grid-cols-2 sm:flex gap-2">
              <button
                onClick={() => setQuickPeriod('all')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  quickPeriod === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setQuickPeriod('today')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  quickPeriod === 'today'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setQuickPeriod('week')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  quickPeriod === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Últimos 7 dias
              </button>
              <button
                onClick={() => setQuickPeriod('month')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  quickPeriod === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Últimos 30 dias
              </button>
            </div>
          </div>

          {/* Indicador de Filtros Ativos */}
          {(quickSearch || quickPeriod !== 'all' || Object.keys(filters).length > 0) && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Filtros ativos:</span>
              {quickSearch && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md">
                  Busca: "{quickSearch}"
                  <button onClick={() => setQuickSearch('')} className="hover:text-blue-900 dark:hover:text-blue-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {quickPeriod !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md">
                  Período: {quickPeriod === 'today' ? 'Hoje' : quickPeriod === 'week' ? '7 dias' : '30 dias'}
                  <button onClick={() => setQuickPeriod('all')} className="hover:text-blue-900 dark:hover:text-blue-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {Object.keys(filters).length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md">
                  Filtros avançados: {Object.keys(filters).length}
                  <button onClick={() => setFilters({})} className="hover:text-blue-900 dark:hover:text-blue-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

          <div className={`transition-all duration-200 overflow-hidden ${showFilters ? 'max-h-[1000px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <AttendanceFilters
                filters={filters}
                onClose={() => setShowFilters(false)}
                onApplyFilters={setFilters}
              />
            </div>
          </div>
          <AttendanceTable 
            atendimentos={filteredAtendimentos} 
            isLoading={isLoading} 
            calculateElapsedTime={calculateElapsedTime}
          />
        </div>
      </Container>

      {/* Botão flutuante de filtros para mobile */}
      <div className="fixed bottom-6 right-6 md:hidden z-50">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="h-14 w-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all duration-200 flex items-center justify-center"
          aria-label="Filtros"
        >
          <Filter className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
