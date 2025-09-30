import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, ChevronDown, FileText, FolderOpen, Folder, Loader2, Edit2, Trash2, Eye, Calendar, Search, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useCompany } from '../../../providers/CompanyProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { requerimentosService, Requerimento } from '../../../services/requerimentos';
import { useToast } from '../../../components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import { Input } from '../../../components/ui/input';

interface RequerimentosPorStatus {
  [status: string]: Requerimento[];
}

interface RequerimentosPorAno {
  [ano: string]: RequerimentosPorStatus;
}

// Adapte o statusConfig conforme os status de Requerimento
const statusConfig: { [key: string]: { label: string; className: string; badgeClass: string; } } = {
  'protocolado': {
    label: 'Protocolado',
    className: 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 ring-1 ring-inset ring-blue-600/20'
  },
  'em_analise': {
    label: 'Em Análise',
    className: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-300',
    badgeClass: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 ring-1 ring-inset ring-yellow-600/20'
  },
  'deferido': {
    label: 'Deferido',
    className: 'bg-green-50 text-green-600 dark:bg-green-900/50 dark:text-green-300',
    badgeClass: 'bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-300 ring-1 ring-inset ring-green-600/20'
  },
  'indeferido': {
    label: 'Indeferido',
    className: 'bg-red-50 text-red-600 dark:bg-red-900/50 dark:text-red-300',
    badgeClass: 'bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300 ring-1 ring-inset ring-red-600/20'
  },
  'arquivado': {
    label: 'Arquivado',
    className: 'bg-gray-50 text-gray-600 dark:bg-gray-900/50 dark:text-gray-300',
    badgeClass: 'bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300 ring-1 ring-inset ring-gray-600/20'
  }
};

export function Requerimentos() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [requerimentos, setRequerimentos] = React.useState<RequerimentosPorAno>({});
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [requerimentoParaDeletar, setRequerimentoParaDeletar] = React.useState<Requerimento | null>(null);

  const carregarRequerimentos = React.useCallback(async () => {
    if (!company?.uid) return;

    try {
      setIsLoading(true);
      const data = await requerimentosService.listar(company.uid);
      
      const requerimentosPorAno: RequerimentosPorAno = {};
      
      (data || []).forEach(req => {
        const ano = new Date(req.data_emissao).getFullYear().toString();
        const status = req.status;
        
        if (!requerimentosPorAno[ano]) {
          requerimentosPorAno[ano] = {};
        }
        if (!requerimentosPorAno[ano][status]) {
          requerimentosPorAno[ano][status] = [];
        }
        requerimentosPorAno[ano][status].push(req);
      });

      setRequerimentos(requerimentosPorAno);
    } catch (error) {
      toast({ title: 'Erro ao carregar requerimentos', description: 'Tente novamente mais tarde.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [company?.uid, toast]);

  React.useEffect(() => {
    carregarRequerimentos();
  }, [carregarRequerimentos]);

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const handleDelete = async () => {
    if (!requerimentoParaDeletar || !user?.uid) return;

    try {
      await requerimentosService.deletar(requerimentoParaDeletar.uid, user.uid);
      toast({ title: 'Requerimento excluído com sucesso!', variant: 'success' });
      setRequerimentoParaDeletar(null);
      carregarRequerimentos(); // Recarrega a lista
    } catch (error) {
      toast({ title: 'Erro ao excluir requerimento', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  const filteredRequerimentos = React.useMemo(() => {
    let filtered = { ...requerimentos };

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = Object.keys(filtered).reduce((acc, ano) => {
        const statusGroup = Object.keys(filtered[ano]).reduce((statusAcc, status) => {
          const reqs = filtered[ano][status].filter(
            req =>
              req.titulo.toLowerCase().includes(query) ||
              req.numero?.toLowerCase().includes(query) ||
              req.solicitante.toLowerCase().includes(query)
          );
          if (reqs.length > 0) {
            statusAcc[status] = reqs;
          }
          return statusAcc;
        }, {} as RequerimentosPorStatus);

        if (Object.keys(statusGroup).length > 0) {
          acc[ano] = statusGroup;
        }
        return acc;
      }, {} as RequerimentosPorAno);
    }

    if (statusFilter) {
        filtered = Object.keys(filtered).reduce((acc, ano) => {
            const statusGroup = filtered[ano][statusFilter] ? { [statusFilter]: filtered[ano][statusFilter] } : {};
            if (Object.keys(statusGroup).length > 0) {
                acc[ano] = statusGroup;
            }
            return acc;
        }, {} as RequerimentosPorAno);
    }

    return filtered;
  }, [requerimentos, searchQuery, statusFilter]);

  const totalRequerimentos = Object.values(filteredRequerimentos).flatMap(anos => Object.values(anos).flatMap(reqs => reqs)).length;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 py-2 px-2">
        <div className="flex flex-col space-y-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => navigate('/app/documentos')} 
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        aria-label="Voltar para Documentos"
                    >
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-500 dark:text-gray-400" />
                    </button>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                        Requerimentos ({totalRequerimentos})
                    </h1>
                </div>
                <div className="hidden md:flex items-center gap-2">
                    <Button onClick={() => navigate('/app/documentos/requerimentos/upload')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Requerimento
                    </Button>
                </div>
            </div>

            <div className="mt-4 flex flex-col md:flex-row items-center gap-2">
              <div className="relative w-full md:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input 
                  placeholder="Buscar por título, número ou solicitante..." 
                  className="pl-10 w-full" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto min-w-[180px] justify-between">
                    {statusFilter ? statusConfig[statusFilter]?.label : 'Filtrar por status'}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => setStatusFilter(null)}>Todos</DropdownMenuItem>
                  {Object.keys(statusConfig).map(status => (
                    <DropdownMenuItem key={status} onSelect={() => setStatusFilter(status)}>{statusConfig[status].label}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            {isLoading ? (
              <div className="p-8 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" /></div>
            ) : (
              <div>
                <div className="space-y-4 p-4">
                  {Object.keys(filteredRequerimentos).sort((a, b) => Number(b) - Number(a)).map(ano => (
                    <div key={ano}>
                      <button onClick={() => toggleItem(ano)} className="w-full flex justify-between items-center text-left py-2">
                        <div className="flex items-center gap-3">
                          <Folder className={`w-6 h-6 ${expandedItems.includes(ano) ? 'text-blue-600' : 'text-gray-500'}`} />
                          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">{ano}</h2>
                        </div>
                        <ChevronDown className={`w-5 h-5 transition-transform ${expandedItems.includes(ano) ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedItems.includes(ano) && (
                        <div className="pl-4 pt-2 space-y-3">
                          {Object.keys(filteredRequerimentos[ano]).map(status => (
                            <div key={status}>
                              <button onClick={() => toggleItem(`${ano}-${status}`)} className="w-full flex justify-between items-center text-left py-2">
                                <div className="flex items-center gap-3">
                                  <FolderOpen className={`w-6 h-6 ${expandedItems.includes(`${ano}-${status}`) ? 'text-blue-500' : 'text-gray-400'}`} />
                                  <span className={`px-2 py-1 text-xs font-medium rounded-md ${statusConfig[status]?.badgeClass}`}>{statusConfig[status]?.label}</span>
                                </div>
                                <ChevronDown className={`w-5 h-5 transition-transform ${expandedItems.includes(`${ano}-${status}`) ? 'rotate-180' : ''}`} />
                              </button>
                              {expandedItems.includes(`${ano}-${status}`) && (
                                <div className="pl-6 pt-2 space-y-2">
                                  {filteredRequerimentos[ano][status].map(req => (
                                    <div key={req.uid} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/app/documentos/requerimentos/${req.uid}`)}>
                                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                        <div className="flex-1">
                                          <p className="font-bold text-gray-800 dark:text-white">{req.titulo}</p>
                                          <p className="text-sm text-gray-500 dark:text-gray-400">Nº: {req.numero} | Solicitante: {req.solicitante}</p>
                                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatarData(req.data_emissao)}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2 pt-2 sm:pt-0 w-full sm:w-auto">
                                          <Button variant="ghost" size="sm" className="flex-1 sm:flex-none bg-white/50 hover:bg-white dark:bg-gray-800/50 dark:hover:bg-gray-800 text-gray-600 hover:text-gray-700 px-2 sm:px-3" onClick={(e) => { e.stopPropagation(); navigate(`/app/documentos/requerimentos/${req.uid}/editar`); }}>
                                            <Edit2 className="w-4 h-4" />
                                            <span className="hidden sm:inline ml-2">Editar</span>
                                          </Button>
                                          <Button variant="ghost" size="sm" className="flex-1 sm:flex-none bg-white/50 hover:bg-white dark:bg-gray-800/50 dark:hover:bg-gray-800 text-red-600 hover:text-red-700 px-2 sm:px-3" onClick={(e) => { e.stopPropagation(); setRequerimentoParaDeletar(req); }}>
                                            <Trash2 className="w-4 h-4" />
                                            <span className="hidden sm:inline ml-2">Excluir</span>
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {totalRequerimentos === 0 && !isLoading && (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      Nenhum requerimento encontrado.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="md:hidden fixed bottom-6 right-6">
        <Button
          onClick={() => navigate('/app/documentos/requerimentos/upload')}
          size="icon"
          className="w-14 h-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <AlertDialog open={!!requerimentoParaDeletar} onOpenChange={(isOpen) => !isOpen && setRequerimentoParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este requerimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O requerimento <strong>{requerimentoParaDeletar?.titulo}</strong> será marcado como excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Confirmar Exclusão</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
