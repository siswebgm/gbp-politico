import { Container, Button, IconButton, Tooltip, Dialog } from '@mui/material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Filter, FileSpreadsheet, FileText } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';
import { AttendanceFilters, AttendanceFilters as IAttendanceFilters } from './components/AttendanceFilters';
import { useAtendimentos } from '../../hooks/useAtendimentos';
import { useCompanyStore } from '../../store/useCompanyStore';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { AttendanceTable } from './components/AttendanceTable';

type AtendimentoStatus = 'Pendente' | 'Em Andamento' | 'Concluído';

export function AttendanceList() {
  const { company } = useCompanyStore();

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
    
    const dataAtendimento = new Date(date);
    if (start) {
      const dataInicio = new Date(start);
      if (dataAtendimento < dataInicio) return false;
    }
    if (end) {
      const dataFim = new Date(end);
      if (dataAtendimento > dataFim) return false;
    }
    return true;
  };

  const filteredAtendimentos = atendimentos.filter(atendimento => {
    // Filtros de texto - só aplica se o filtro não estiver vazio
    if (filters.eleitor && !matchesText(atendimento.eleitor || atendimento.gbp_eleitores?.nome, filters.eleitor)) return false;
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
    <div className="bg-white dark:bg-gray-800 min-h-screen py-6">
      <Container maxWidth={false}>
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold dark:text-white">Atendimentos</h1>
                <p className="text-gray-600 dark:text-gray-400">Gerencie todos os atendimentos em um só lugar</p>
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

                <div className="hidden md:flex gap-2">
                  <Tooltip title={!hasAdminAccess ? "Acesso restrito a administradores" : "Exportar para Excel"}>
                    <span>
                      <IconButton 
                        onClick={handleExportExcel} 
                        disabled={!hasAdminAccess}
                        className={!hasAdminAccess ? 'text-gray-400 cursor-not-allowed' : 'text-green-600 hover:text-green-700'}
                      >
                        <FileSpreadsheet className={`w-5 h-5 ${hasAdminAccess ? 'text-green-600' : 'text-gray-400'}`} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={!hasAdminAccess ? "Acesso restrito a administradores" : "Exportar para PDF"}>
                    <span>
                      <IconButton 
                        onClick={handleExportPDF} 
                        disabled={!hasAdminAccess}
                        className={!hasAdminAccess ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-700'}
                      >
                        <FileText className={`w-5 h-5 ${hasAdminAccess ? 'text-red-600' : 'text-gray-400'}`} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 cursor-pointer">
          <div 
            onClick={() => setStatusFilter('all')} 
            className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${statusFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-semibold mt-2">{statusCounts.total}</p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter('Pendente')} 
            className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${statusFilter === 'Pendente' ? 'ring-2 ring-yellow-500' : ''}`}
          >
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendentes</p>
                <p className="text-2xl font-semibold mt-2">{statusCounts.pendentes}</p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-yellow-600 h-2 rounded-full" style={{ width: `${(statusCounts.pendentes / statusCounts.total) * 100}%` }} />
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter('Em Andamento')} 
            className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${statusFilter === 'Em Andamento' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Em Andamento</p>
                <p className="text-2xl font-semibold mt-2">{statusCounts.emAndamento}</p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(statusCounts.emAndamento / statusCounts.total) * 100}%` }} />
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter('Concluído')} 
            className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${statusFilter === 'Concluído' ? 'ring-2 ring-green-500' : ''}`}
          >
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Concluídos</p>
                <p className="text-2xl font-semibold mt-2">{statusCounts.concluidos}</p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: `${(statusCounts.concluidos / statusCounts.total) * 100}%` }} />
            </div>
          </div>


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
          <AttendanceTable atendimentos={filteredAtendimentos} isLoading={isLoading} />
        </div>
      </Container>
    </div>
  );
}
