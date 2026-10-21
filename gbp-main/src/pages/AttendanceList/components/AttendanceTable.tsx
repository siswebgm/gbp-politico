import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog as HeadlessDialog } from '@headlessui/react';
import { 
  Share2,
  ChevronDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Printer,
  MoreVertical,
  Filter,
} from 'lucide-react';
import { useAtendimentos } from '../../../hooks/useAtendimentos';

type AtendimentoStatus = 'Pendente' | 'Em Andamento' | 'Concluído';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useToast } from '../../../hooks/useToast';
import { deleteAttendance } from '../../../services/attendance';

import { AttendanceDrawer } from './AttendanceDrawer';
import ShareAtendimentoModal from '../../../components/ShareAtendimentoModal';
import { useAuthStore } from '../../../store/useAuthStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { carregarImagemBase64, desenharBlocoAtendimento, extrairFotoUrl } from '../../../utils/atendimentoPdf';

const statusConfig = {
  'Pendente': {
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    icon: Clock,
  },
  'Em Andamento': {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    icon: AlertCircle,
  },
  'Concluído': {
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    icon: CheckCircle,
  },

} as const;

interface AttendanceTableProps {
  atendimentos: any[];
  isLoading?: boolean;
  calculateElapsedTime?: (dataAtendimento: string) => string;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onNavigateToPerson?: (eleitorUid: string) => void;
}

// Tom da coluna Tempo: sinaliza idade de atendimentos não concluídos
// >30 dias = vermelho, >7 dias = amarelo (ajuda a ver gargalos sem ler)
type ElapsedTone = 'normal' | 'warning' | 'danger';

const getElapsedTone = (atendimento: any): ElapsedTone => {
  if (!atendimento.data_atendimento || atendimento.status === 'Concluído') return 'normal';
  const dias = Math.floor((Date.now() - new Date(atendimento.data_atendimento).getTime()) / 86400000);
  if (dias > 30) return 'danger';
  if (dias > 7) return 'warning';
  return 'normal';
};

const elapsedTextClass: Record<ElapsedTone, string> = {
  normal: 'text-gray-600 dark:text-gray-400',
  warning: 'text-yellow-600 dark:text-yellow-400 font-medium',
  danger: 'text-red-600 dark:text-red-400 font-medium',
};

const elapsedIconClass: Record<ElapsedTone, string> = {
  normal: 'text-gray-400',
  warning: 'text-yellow-500 dark:text-yellow-400',
  danger: 'text-red-500 dark:text-red-400',
};

const formatDataAtendimento = (data?: string) =>
  data ? `Data do atendimento: ${new Date(data).toLocaleDateString('pt-BR')}` : undefined;

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  atendimentos,
  isLoading,
  calculateElapsedTime,
  hasActiveFilters,
  onClearFilters,
  onNavigateToPerson,
}) => {
  const navigate = useNavigate();
  const company = useCompanyStore((state) => state.company);
  const { updateAtendimentoStatus } = useAtendimentos();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAtendimento, setSelectedAtendimento] = useState<any>(null);
  const [openStatusMenu, setOpenStatusMenu] = useState<string | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const tableTopRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(atendimentos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = atendimentos.slice(startIndex, endIndex);
  const [atendimentoToDelete, setAtendimentoToDelete] = useState<any | null>(null);
  const [openShareModal, setOpenShareModal] = useState(false);
  const [selectedAtendimentoToShare, setSelectedAtendimentoToShare] = useState<any | null>(null);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (uid: string) => deleteAttendance(uid),
    onSuccess: () => {
      toast.showToast({
        title: 'Atendimento excluído',
        description: `O atendimento ${atendimentoToDelete?.numero ? `#${atendimentoToDelete.numero}` : ''} foi excluído com sucesso.`,
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['atendimentos'] });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast.showToast({
        title: 'Erro ao excluir atendimento',
        description: 'Ocorreu um erro ao tentar excluir o atendimento. Por favor, tente novamente.',
        type: 'error',
      });
    },
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Volta ao topo da lista — desconta o header fixo (~80px) para não ficar escondido
    const el = tableTopRef.current;
    if (!el) return;
    const scroller = el.closest('main') as HTMLElement | null;
    const top = el.getBoundingClientRect().top + (scroller ? scroller.scrollTop : window.scrollY) - 80;
    (scroller || window).scrollTo({ top, behavior: 'smooth' });
  };

  const handleRowClick = (atendimento: any) => {
    setSelectedAtendimento(atendimento);
    setDrawerOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, atendimento: any) => {
    e.stopPropagation();
    setAtendimentoToDelete(atendimento);
    setDeleteDialogOpen(true);
  };

  const handleStatusChange = async (uid: string, newStatus: AtendimentoStatus) => {
    try {
      await updateAtendimentoStatus.mutateAsync({ uid, status: newStatus, user });
      setOpenStatusMenu(null);
      toast.showToast({
        title: 'Status atualizado',
        description: 'O status do atendimento foi atualizado com sucesso',
        type: 'success',
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast.showToast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status do atendimento',
        type: 'error',
      });
    }
  };




  const confirmDelete = () => {
    if (atendimentoToDelete) {
      deleteMutation.mutate(atendimentoToDelete.uid);
    }
  };

  const handleShare = (e: React.MouseEvent, atendimento: any) => {
    if (!atendimento?.uid) {
      console.error('Atendimento inválido:', atendimento);
      toast.showToast({
        title: 'Erro ao compartilhar',
        description: 'Não foi possível compartilhar este atendimento. Tente novamente.',
        type: 'error'
      });
      return;
    }

    e.stopPropagation();
    setSelectedAtendimentoToShare(atendimento);
    setOpenShareModal(true);
  };

  const handlePrint = async (e: React.MouseEvent, atendimento: any) => {
    e.stopPropagation();
    
    const jsPDF = (await import('jspdf')).default;
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text('GBP Político', 15, 10);
    
    // Data e hora
    const now = new Date();
    const dataHora = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
    doc.text(dataHora, 195, 10, { align: 'right' });
    
    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Detalhes do Atendimento', 105, 20, { align: 'center' });
    
    // Carrega a foto do eleitor (gbp_eleitores.foto_url)
    const fotoUrl = extrairFotoUrl(atendimento.gbp_eleitores?.foto_url);
    const fotoBase64 = fotoUrl ? await carregarImagemBase64(fotoUrl) : null;

    const tituloBloco = atendimento.numero
      ? `Atendimento Nº ${atendimento.numero}`
      : 'Informações do Atendimento';
    desenharBlocoAtendimento(doc, atendimento, 35, tituloBloco, fotoBase64);

    // Rodapé
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text('Página 1', 105, 290, { align: 'center' });
    
    const eleitorName = atendimento.eleitor || atendimento.gbp_eleitores?.nome || 'atendimento';
    const fileName = `atendimento_${eleitorName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    toast.showToast({
      title: 'PDF gerado com sucesso',
      description: 'O documento foi baixado',
      type: 'success',
    });
  };

  // Função para contar quantos atendimentos um eleitor tem
  const getEleitorAtendimentosCount = (eleitorName: string): number => {
    if (!eleitorName) return 0;
    return atendimentos.filter(atd => {
      const name = atd.eleitor || atd.gbp_eleitores?.nome;
      return name?.toLowerCase() === eleitorName.toLowerCase();
    }).length;
  };

  const formatName = (fullName: string | null | undefined): string => {
    if (!fullName || fullName.trim() === '') return '-';
    
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length === 1) return nameParts[0];
    
    // Retorna o primeiro e último nome
    return `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
  };

  // Função para obter o nome do eleitor
  const getEleitorName = (atendimento: any): string => {
    // Tenta primeiro o campo eleitor da tabela
    if (atendimento.eleitor && atendimento.eleitor.trim() !== '') {
      return atendimento.eleitor;
    }
    // Se não tiver, tenta o nome do relacionamento
    if (atendimento.gbp_eleitores?.nome && atendimento.gbp_eleitores.nome.trim() !== '') {
      return atendimento.gbp_eleitores.nome;
    }
    return '-';
  };

  // Fecha o menu quando clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenStatusMenu(null);
      setOpenActionMenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900/20 p-3 mb-4">
            <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Carregando dados...
          </h3>
        </div>
      </div>
    );
  }

  if (atendimentos.length === 0) {
    // Lista zerada por causa dos filtros ≠ empresa sem atendimentos
    if (hasActiveFilters) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-gray-100 dark:bg-gray-700 p-3 mb-4">
              <Filter className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Nenhum resultado para os filtros aplicados
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Tente ajustar a busca ou remover alguns filtros
            </p>
            {onClearFilters && (
              <button
                onClick={onClearFilters}
                className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-gray-100 dark:bg-gray-700 p-3 mb-4">
            <Clock className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Nenhum atendimento encontrado
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Clique no botão "Novo Atendimento" para começar
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={tableTopRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-visible">
        {/* Header com contagem total */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                <span className="sm:hidden">Lista</span>
                <span className="hidden sm:inline">Lista de Atendimentos</span>
              </h3>
              <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 whitespace-nowrap">
                {atendimentos.length} {atendimentos.length === 1 ? 'atendimento' : 'atendimentos'}
              </span>
            </div>
            {atendimentos.length > itemsPerPage && (
              <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400">
                Mostrando {startIndex + 1}-{Math.min(endIndex, atendimentos.length)} de {atendimentos.length}
              </span>
            )}
          </div>
        </div>

        {/* View para Desktop */}
        <div className={`hidden md:block overflow-x-auto ${atendimentos.length <= 3 ? 'pb-32' : ''}`}>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="w-1/3 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Eleitor
                </th>
                <th scope="col" className="w-1/3 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Categoria
                </th>
                <th scope="col" className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tempo
                </th>
                <th scope="col" className="w-20 relative px-6 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
              {currentItems.map((atendimento) => {
                const StatusIcon = statusConfig[atendimento.status as AtendimentoStatus]?.icon || AlertCircle;
                return (
                  <tr
                    key={atendimento.uid}
                    onClick={() => handleRowClick(atendimento)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    title="Clique para ver os detalhes do atendimento"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (atendimento.eleitor_uid) {
                              if (onNavigateToPerson) {
                                onNavigateToPerson(atendimento.eleitor_uid);
                              } else {
                                navigate(`/app/pessoas/${atendimento.eleitor_uid}`);
                              }
                            }
                          }}
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                          title="Ver ficha do eleitor"
                        >
                          {getEleitorName(atendimento)}
                        </div>
                        {(() => {
                          const count = getEleitorAtendimentosCount(getEleitorName(atendimento));
                          return (
                            <span 
                              className="inline-flex items-center justify-center min-w-[24px] h-5 px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              title={`${count} atendimento${count !== 1 ? 's' : ''}`}
                            >
                              {count}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                        {atendimento.gbp_categorias?.nome || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenStatusMenu(openStatusMenu === atendimento.uid ? null : atendimento.uid);
                          }}
                          className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium ${
                            statusConfig[atendimento.status as AtendimentoStatus]?.color
                          }`}
                          title="Clique para alterar o status"
                        >
                          <StatusIcon className="h-4 w-4 mr-1" />
                          {atendimento.status}
                          <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
                        </button>
                        
                        {openStatusMenu === atendimento.uid && (
                          <div className="absolute z-10 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                            <div className="py-1">
                              {Object.keys(statusConfig).map((status) => {
                                const Icon = statusConfig[status as AtendimentoStatus].icon;
                                return (
                                  <button
                                    key={status}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(atendimento.uid, status as AtendimentoStatus);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 ${
                                      status === atendimento.status
                                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    <Icon className={`w-4 h-4 ${statusConfig[status as AtendimentoStatus].color.replace('bg-', 'text-')}`} />
                                    <span>{status}</span>
                                    {status === atendimento.status && (
                                      <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2" title={formatDataAtendimento(atendimento.data_atendimento)}>
                        <Clock className={`h-4 w-4 ${elapsedIconClass[getElapsedTone(atendimento)]}`} />
                        <span className={`text-sm ${elapsedTextClass[getElapsedTone(atendimento)]}`}>
                          {atendimento.data_atendimento && calculateElapsedTime 
                            ? calculateElapsedTime(atendimento.data_atendimento)
                            : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium overflow-visible">
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenu(openActionMenu === atendimento.uid ? null : atendimento.uid);
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>

                        {openActionMenu === atendimento.uid && (
                          <div className="absolute right-0 top-8 z-50 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(atendimento);
                                setOpenActionMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 rounded-t-lg"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Ver detalhes</span>
                            </button>
                            <button
                              onClick={(e) => {
                                handlePrint(e, atendimento);
                                setOpenActionMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                            >
                              <Printer className="w-4 h-4" />
                              <span>Imprimir</span>
                            </button>
                            <button
                              onClick={(e) => {
                                handleShare(e, atendimento);
                                setOpenActionMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                            >
                              <Share2 className="w-4 h-4" />
                              <span>Compartilhar</span>
                            </button>
                            {user?.nivel_acesso === 'admin' && (
                              <button
                                onClick={(e) => {
                                  handleDelete(e, atendimento);
                                  setOpenActionMenu(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 rounded-b-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Excluir</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* View para Mobile */}
        <div className={`md:hidden ${atendimentos.length <= 3 ? 'min-h-[300px]' : ''}`}>
          <div className={`divide-y divide-gray-200 dark:divide-gray-700 ${atendimentos.length <= 3 ? 'pb-32' : ''}`}>
            {currentItems.map((atendimento) => {
              const StatusIcon = statusConfig[atendimento.status as AtendimentoStatus]?.icon || AlertCircle;
              return (
                <div 
                  key={atendimento.uid} 
                  className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  onClick={() => handleRowClick(atendimento)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (atendimento.eleitor_uid) {
                            if (onNavigateToPerson) {
                              onNavigateToPerson(atendimento.eleitor_uid);
                            } else {
                              navigate(`/app/pessoas/${atendimento.eleitor_uid}`);
                            }
                          }
                        }}
                        className="text-base font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer truncate"
                        title="Ver ficha do eleitor"
                      >
                        {getEleitorName(atendimento)}
                      </div>
                      {(() => {
                        const count = getEleitorAtendimentosCount(getEleitorName(atendimento));
                        return (
                          <span 
                            className="inline-flex items-center justify-center min-w-[24px] h-5 px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                            title={`${count} atendimento${count !== 1 ? 's' : ''}`}
                          >
                            {count}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenActionMenu(openActionMenu === atendimento.uid ? null : atendimento.uid);
                        }}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </button>

                      {openActionMenu === atendimento.uid && (
                        <div className="absolute right-0 top-8 z-50 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(atendimento);
                              setOpenActionMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 rounded-t-lg"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Ver detalhes</span>
                          </button>
                          <button
                            onClick={(e) => {
                              handlePrint(e, atendimento);
                              setOpenActionMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                          >
                            <Printer className="w-4 h-4" />
                            <span>Imprimir</span>
                          </button>
                          <button
                            onClick={(e) => {
                              handleShare(e, atendimento);
                              setOpenActionMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Compartilhar</span>
                          </button>
                          {user?.nivel_acesso === 'admin' && (
                            <button
                              onClick={(e) => {
                                handleDelete(e, atendimento);
                                setOpenActionMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 rounded-b-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Excluir</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenStatusMenu(openStatusMenu === atendimento.uid ? null : atendimento.uid);
                        }}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          statusConfig[atendimento.status as AtendimentoStatus]?.color
                        }`}
                        title="Clique para alterar o status"
                      >
                        <StatusIcon className="w-3.5 h-3.5 mr-1" />
                        {atendimento.status}
                        <ChevronDown className="w-3.5 h-3.5 ml-1" />
                      </button>
                      
                      {openStatusMenu === atendimento.uid && (
                        <div className="absolute left-0 z-10 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                          <div className="py-1">
                            {Object.keys(statusConfig).map((status) => {
                              const Icon = statusConfig[status as AtendimentoStatus].icon;
                              return (
                                <button
                                  key={status}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(atendimento.uid, status as AtendimentoStatus);
                                  }}
                                  className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 ${
                                    status === atendimento.status
                                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  <Icon className={`w-4 h-4 ${statusConfig[status as AtendimentoStatus].color.replace('bg-', 'text-')}`} />
                                  <span>{status}</span>
                                  {status === atendimento.status && (
                                    <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {atendimento.data_atendimento && calculateElapsedTime && (
                      <div className={`flex items-center gap-1 text-sm ${elapsedTextClass[getElapsedTone(atendimento)]}`} title={formatDataAtendimento(atendimento.data_atendimento)}>
                        <Clock className={`h-3.5 w-3.5 ${elapsedIconClass[getElapsedTone(atendimento)]}`} />
                        <span>Há {calculateElapsedTime(atendimento.data_atendimento)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p><span className="font-medium">Categoria:</span> {atendimento.gbp_categorias?.nome || 'N/A'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Paginação */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
          {/* Versão Mobile */}
          <div className="sm:hidden">
            <div className="flex flex-col space-y-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Mostrando <span className="font-medium">{startIndex + 1}</span> até{' '}
                <span className="font-medium">{Math.min(endIndex, atendimentos.length)}</span> de{' '}
                <span className="font-medium">{atendimentos.length}</span> resultados
              </div>
              <div className="flex justify-center items-center space-x-1">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Primeira página"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-md"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-md"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Última página"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Versão Desktop */}
          <div className="hidden sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Mostrando <span className="font-medium text-gray-700 dark:text-gray-300">{startIndex + 1}</span> até{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">{Math.min(endIndex, atendimentos.length)}</span> de{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">{atendimentos.length}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex items-center space-x-1">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Primeira página"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Última página"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Drawer de Detalhes */}
        <AttendanceDrawer
          isOpen={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedAtendimento(null);
          }}
          atendimento={selectedAtendimento}
        />

        {/* Diálogo de confirmação de exclusão */}
        <HeadlessDialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setAtendimentoToDelete(null);
          }}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <HeadlessDialog.Panel className="mx-auto max-w-sm w-full rounded-lg bg-white dark:bg-gray-800 shadow-xl">
              <div className="flex flex-col items-center px-6 py-8">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                  <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div className="mt-6 text-center w-full px-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Excluir atendimento
                  </h3>
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Tem certeza que deseja excluir este atendimento? Esta ação não pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-6 sm:px-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col gap-3 sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2.5 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto sm:min-w-[100px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    onClick={() => {
                      confirmDelete();
                      setAtendimentoToDelete(null);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Excluindo...
                      </>
                    ) : (
                      'Excluir'
                    )}
                  </button>
                  <button
                    type="button"
                    className="w-full justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-base font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto sm:min-w-[100px]"
                    onClick={() => {
                      setDeleteDialogOpen(false);
                      setAtendimentoToDelete(null);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </HeadlessDialog.Panel>
          </div>
        </HeadlessDialog>

        {/* Modal de Compartilhamento */}
        {selectedAtendimentoToShare && (
          <ShareAtendimentoModal
            open={openShareModal}
            onClose={() => {
              setOpenShareModal(false);
              setSelectedAtendimentoToShare(null);
            }}
            atendimentoUid={selectedAtendimentoToShare.uid}
            empresaUid={company?.uid || ''}
            onPermissionChange={() => {
              // Atualizar a lista de atendimentos se necessário
            }}
          />
        )}
      </div>
    </>
  );
}







  MoreVertical
