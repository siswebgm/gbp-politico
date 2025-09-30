import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog as HeadlessDialog } from '@headlessui/react';
import { 
  Share2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle
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
}

export function AttendanceTable({ atendimentos, isLoading = false }: AttendanceTableProps) {
  const navigate = useNavigate();
  const company = useCompanyStore((state) => state.company);
  const { updateAtendimentoStatus } = useAtendimentos();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAtendimento, setSelectedAtendimento] = useState<any>(null);
  const [openStatusMenu, setOpenStatusMenu] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {/* View para Desktop */}
        <div className="hidden md:block overflow-x-auto">
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
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (atendimento.eleitor_uid) {
                            navigate(`/app/eleitores/${atendimento.eleitor_uid}`);
                          }
                        }}
                        className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer min-w-[100px]"
                        title={getEleitorName(atendimento)}
                      >
                        {formatName(getEleitorName(atendimento))}
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
                        >
                          <StatusIcon className="h-4 w-4 mr-1" />
                          {atendimento.status}
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={(e) => handleShare(e, atendimento)}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, atendimento)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* View para Mobile */}
        <div className="md:hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {currentItems.map((atendimento) => {
              const StatusIcon = statusConfig[atendimento.status as AtendimentoStatus]?.icon || AlertCircle;
              return (
                <div 
                  key={atendimento.uid} 
                  className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  onClick={() => handleRowClick(atendimento)}
                >
                  <div className="flex justify-between items-start">
                    <div className="text-base font-medium text-gray-900 dark:text-white">
                      {formatName(getEleitorName(atendimento))}
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenStatusMenu(openStatusMenu === atendimento.uid ? null : atendimento.uid);
                        }}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusConfig[atendimento.status as AtendimentoStatus]?.color
                        }`}
                      >
                        <StatusIcon className="w-3.5 h-3.5 mr-1" />
                        {atendimento.status}
                        <ChevronDown className="w-3.5 h-3.5 ml-1" />
                      </button>
                      
                      {openStatusMenu === atendimento.uid && (
                        <div className="absolute right-0 z-10 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
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
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p><span className="font-medium">Categoria:</span> {atendimento.gbp_categorias?.nome || 'N/A'}</p>
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={(e) => handleShare(e, atendimento)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, atendimento)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Paginação */}
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
          {/* Versão Mobile */}
          <div className="sm:hidden">
            <div className="flex flex-col space-y-3">
              <div className="text-sm text-gray-700 dark:text-gray-300 text-center">
                <span className="font-medium">{startIndex + 1}</span>-
                <span className="font-medium">{Math.min(endIndex, atendimentos.length)}</span> de{' '}
                <span className="font-medium">{atendimentos.length}</span>
              </div>
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronsLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5 mr-1" />
                  Anterior
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Próxima
                  <ChevronRight className="h-5 w-5 ml-1" />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronsRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Versão Desktop */}
          <div className="hidden sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando <span className="font-medium">{startIndex + 1}</span> até{' '}
                <span className="font-medium">{Math.min(endIndex, atendimentos.length)}</span> de{' '}
                <span className="font-medium">{atendimentos.length}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <span className="sr-only">Primeira</span>
                  <ChevronsLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <span className="sr-only">Anterior</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <span className="sr-only">Próxima</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <span className="sr-only">Última</span>
                  <ChevronsRight className="h-5 w-5" />
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