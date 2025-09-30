import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, ChevronDown, FileText, FolderOpen, Folder, Loader2, Edit2, Trash2, Eye, Calendar, Search, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useCompany } from '../../../providers/CompanyProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { projetosLeiService } from '../../../services/projetosLei';
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

interface ProjetoLei {
  uid: string;
  numero: string | null;
  ano: number;
  titulo: string;
  autor: string;
  coautores: string[];
  data_protocolo: string;
  status: 'em_andamento' | 'aprovado' | 'arquivado' | 'lei_em_vigor' | 'vetado';
  ementa: string;
  tags?: string[];
  arquivos?: string[];
  created_at: string;
  updated_at: string;
}

interface ProjetosPorStatus {
  [status: string]: ProjetoLei[];
}

interface ProjetosPorAno {
  [ano: string]: ProjetosPorStatus;
}

const statusConfig = {
  'aprovado': {
    label: 'Aprovado',
    className: 'bg-green-50 text-green-600 dark:bg-green-900/50 dark:text-green-300',
    badgeClass: 'bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-300 ring-1 ring-inset ring-green-600/20'
  },
  'arquivado': {
    label: 'Arquivado',
    className: 'bg-gray-50 text-gray-600 dark:bg-gray-900/50 dark:text-gray-300',
    badgeClass: 'bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300 ring-1 ring-inset ring-gray-600/20'
  },
  'em_andamento': {
    label: 'Em Andamento',
    className: 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 ring-1 ring-inset ring-blue-600/20'
  },
  'lei_em_vigor': {
    label: 'Lei em Vigor',
    className: 'bg-purple-50 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300',
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 ring-1 ring-inset ring-purple-600/20'
  },
  'vetado': {
    label: 'Vetado',
    className: 'bg-red-50 text-red-600 dark:bg-red-900/50 dark:text-red-300',
    badgeClass: 'bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300 ring-1 ring-inset ring-red-600/20'
  }
};

export default function ProjetosLei() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [projetos, setProjetos] = React.useState<ProjetosPorAno>({});
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [projetoParaDeletar, setProjetoParaDeletar] = React.useState<ProjetoLei | null>(null);

  const carregarProjetos = React.useCallback(async () => {
    if (!company?.uid) return;

    try {
      setIsLoading(true);
      const data = await projetosLeiService.listar(company.uid);
      
      // Organiza os projetos por ano e status
      const projetosPorAno: ProjetosPorAno = {};
      
      data.forEach(projeto => {
        const ano = projeto.ano.toString();
        const status = projeto.status;
        
        // Parse dos campos JSON com tratamento de erro
        const projetoFormatado = {
          ...projeto,
          coautores: Array.isArray(projeto.coautores) ? projeto.coautores : 
                     (typeof projeto.coautores === 'string' ? 
                      (projeto.coautores.startsWith('[') ? JSON.parse(projeto.coautores) : []) : 
                      []),
          tags: Array.isArray(projeto.tags) ? projeto.tags : 
                (typeof projeto.tags === 'string' ? 
                 (projeto.tags.startsWith('[') ? JSON.parse(projeto.tags) : []) : 
                 []),
          arquivos: Array.isArray(projeto.arquivos) ? projeto.arquivos : 
                   (typeof projeto.arquivos === 'string' ? 
                    (projeto.arquivos.startsWith('[') ? JSON.parse(projeto.arquivos) : []) : 
                    [])
        };
        
        if (!projetosPorAno[ano]) {
          projetosPorAno[ano] = {
            'aprovado': [],
            'arquivado': [],
            'em_andamento': [],
            'lei_em_vigor': [],
            'vetado': []
          };
        }
        
        projetosPorAno[ano][status].push(projetoFormatado);
      });

      setProjetos(projetosPorAno);
      
      // Expande o ano atual por padrão
      const anoAtual = new Date().getFullYear().toString();
      if (projetosPorAno[anoAtual]) {
        // Inicializa o estado de expansão dos status como fechado

      }
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      toast({
        title: "❌ Erro ao carregar projetos",
        description: "Não foi possível carregar a lista de projetos.",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [company?.uid, toast]);

  React.useEffect(() => {
    carregarProjetos();
  }, [carregarProjetos]);

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };



  const handleDelete = async () => {
    if (!projetoParaDeletar || !user?.uid) {
      toast({ title: "Erro", description: "Projeto ou usuário não identificado.", variant: "error" });
      return;
    }

    try {
      await projetosLeiService.deletar(projetoParaDeletar.uid, user.uid);
      toast({
        title: "✅ Projeto excluído",
        description: "O projeto foi excluído com sucesso.",
      });
      carregarProjetos();
    } catch (error) {
      console.error('Erro ao excluir projeto:', error);
      toast({
        title: "❌ Erro ao excluir projeto",
        variant: "error",
      });
    } finally {
      setProjetoParaDeletar(null);
    }
  };

  const handleView = (id: string) => {
    const url = `/app/documentos/projetos-lei/visualizar/${id}`;
    console.log('Abrindo projeto:', { id, url });
    window.open(url, '_blank');
  };

  // Totais por status
  const projetosEmAndamento = React.useMemo(() => {
    return Object.values(projetos).reduce((acc, projetosDoAno) => acc + projetosDoAno['em_andamento'].length, 0);
  }, [projetos]);

  const projetosAprovados = React.useMemo(() => {
    return Object.values(projetos).reduce((acc, projetosDoAno) => acc + projetosDoAno['aprovado'].length, 0);
  }, [projetos]);

  const projetosArquivados = React.useMemo(() => {
    return Object.values(projetos).reduce((acc, projetosDoAno) => acc + projetosDoAno['arquivado'].length, 0);
  }, [projetos]);

  const projetosLeiEmVigor = React.useMemo(() => {
    return Object.values(projetos).reduce((acc, projetosDoAno) => acc + projetosDoAno['lei_em_vigor'].length, 0);
  }, [projetos]);

  const projetosVetados = React.useMemo(() => {
    return Object.values(projetos).reduce((acc, projetosDoAno) => acc + projetosDoAno['vetado'].length, 0);
  }, [projetos]);

  // Agrupar projetos por ano
  const projetosPorAno = React.useMemo(() => {
    return projetos;
  }, [projetos]);

  // Função para contar projetos por status em um ano específico
  const contarProjetosPorStatus = React.useCallback((projetosDoAno: ProjetosPorStatus) => {
    return {
      aprovado: projetosDoAno['aprovado'].length,
      arquivado: projetosDoAno['arquivado'].length,
      em_andamento: projetosDoAno['em_andamento'].length,
      lei_em_vigor: projetosDoAno['lei_em_vigor'].length,
      vetado: projetosDoAno['vetado'].length
    };
  }, []);

  // Filtrar projetos baseado na busca e status
  const filtrarProjetos = React.useCallback((projetosDoAno: ProjetosPorStatus) => {
    return Object.values(projetosDoAno).flat().filter(projeto => {
      const matchStatus = !statusFilter || projeto.status === statusFilter;
      const matchSearch = !searchQuery || 
        projeto.numero?.toString().toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [statusFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 py-2 px-2 md:py-6 md:px-4">
        <div className="flex flex-col h-full space-y-4">
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/app/documentos')} 
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                  aria-label="Voltar para Documentos"
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                    Projetos de Lei
                  </h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Gerencie todos os projetos de lei da sua empresa
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/app/documentos/projetos-lei/upload')}
                className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Novo Projeto
              </Button>
            </div>
          </div>



          {/* Content Section */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="h-full divide-y divide-gray-100 dark:divide-gray-700">
                {/* Campo de Busca e Filtros */}
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 sm:p-6">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial sm:w-[300px]">
                      <Input
                        type="text"
                        placeholder="Buscar por número do projeto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSearchQuery('')}
                        className="shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Filtros em Desktop */}
                  <div className="hidden sm:flex items-center w-full max-w-[900px] overflow-x-auto pb-2">
                    <div className="flex gap-2 min-w-max">
                      <Button
                        variant="outline"
                        size="sm"
                        className={`justify-between whitespace-nowrap ${statusFilter === 'aprovado' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : ''}`}
                        onClick={() => setStatusFilter('aprovado')}
                      >
                        <span>Aprovado</span>
                        <span className="ml-1.5 px-1.5 py-0.5 text-[11px] rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                          {projetosAprovados}
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`justify-between whitespace-nowrap ${statusFilter === 'arquivado' ? 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800' : ''}`}
                        onClick={() => setStatusFilter('arquivado')}
                      >
                        <span>Arquivado</span>
                        <span className="ml-1.5 px-1.5 py-0.5 text-[11px] rounded-full bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
                          {projetosArquivados}
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`justify-between whitespace-nowrap ${statusFilter === 'em_andamento' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : ''}`}
                        onClick={() => setStatusFilter('em_andamento')}
                      >
                        <span>Em Andamento</span>
                        <span className="ml-1.5 px-1.5 py-0.5 text-[11px] rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                          {projetosEmAndamento}
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`justify-between whitespace-nowrap ${statusFilter === 'lei_em_vigor' ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800' : ''}`}
                        onClick={() => setStatusFilter('lei_em_vigor')}
                      >
                        <span>Lei em Vigor</span>
                        <span className="ml-1.5 px-1.5 py-0.5 text-[11px] rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                          {projetosLeiEmVigor}
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`justify-between whitespace-nowrap ${statusFilter === 'vetado' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : ''}`}
                        onClick={() => setStatusFilter('vetado')}
                      >
                        <span>Vetado</span>
                        <span className="ml-1.5 px-1.5 py-0.5 text-[11px] rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                          {projetosVetados}
                        </span>
                      </Button>
                    </div>
                    {/* Botão de limpar filtros */}
                    {statusFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        onClick={() => setStatusFilter(null)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Limpar filtro
                      </Button>
                    )}
                  </div>

                  {/* Filtros em Mobile - Dropdown */}
                  <div className="sm:hidden w-full">
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="flex-1 justify-between">
                            <span>
                              {statusFilter === 'aprovado' ? 'Aprovado' :
                               statusFilter === 'arquivado' ? 'Arquivado' :
                               statusFilter === 'em_andamento' ? 'Em Andamento' :
                               statusFilter === 'lei_em_vigor' ? 'Lei em Vigor' :
                               statusFilter === 'vetado' ? 'Vetado' :
                               'Todos'}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-gray-100 text-gray-700">
                                {statusFilter === 'aprovado' ? projetosAprovados :
                                 statusFilter === 'arquivado' ? projetosArquivados :
                                 statusFilter === 'em_andamento' ? projetosEmAndamento :
                                 statusFilter === 'lei_em_vigor' ? projetosLeiEmVigor :
                                 statusFilter === 'vetado' ? projetosVetados :
                                 Object.keys(projetos).length}
                              </span>
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[calc(100vw-2rem)] sm:w-56">
                          <DropdownMenuItem onClick={() => setStatusFilter('aprovado')}>
                            <div className="flex justify-between items-center w-full">
                              <span>Aprovado</span>
                              <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-green-100 text-green-700">
                                {projetosAprovados}
                              </span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatusFilter('arquivado')}>
                            <div className="flex justify-between items-center w-full">
                              <span>Arquivado</span>
                              <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-gray-100 text-gray-700">
                                {projetosArquivados}
                              </span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatusFilter('em_andamento')}>
                            <div className="flex justify-between items-center w-full">
                              <span>Em Andamento</span>
                              <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-blue-100 text-blue-700">
                                {projetosEmAndamento}
                              </span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatusFilter('lei_em_vigor')}>
                            <div className="flex justify-between items-center w-full">
                              <span>Lei em Vigor</span>
                              <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-purple-100 text-purple-700">
                                {projetosLeiEmVigor}
                              </span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatusFilter('vetado')}>
                            <div className="flex justify-between items-center w-full">
                              <span>Vetado</span>
                              <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-red-100 text-red-700">
                                {projetosVetados}
                              </span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                            <div className="flex justify-between items-center w-full">
                              <span>Todos</span>
                              <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-gray-100 text-gray-700">
                                {Object.keys(projetos).length}
                              </span>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {/* Botão de limpar filtros em mobile */}
                      {statusFilter && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          onClick={() => setStatusFilter(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lista de Projetos por Ano */}
                <div className="flex-1 space-y-4">
                  {Object.entries(projetosPorAno)
                    .sort(([yearA], [yearB]) => parseInt(yearB) - parseInt(yearA))
                    .map(([ano, projetosDoAno]) => {
                      const projetosFiltrados = filtrarProjetos(projetosDoAno);
                      const contagem = projetosFiltrados.length;
                      
                      // Se não houver projetos neste ano, não mostra o grupo
                      if (contagem === 0) {
                        return null;
                      }

                      return (
                        <div key={ano} className="bg-white dark:bg-gray-800">
                          <button
                            onClick={() => toggleItem(ano)}
                            className="w-full flex items-center gap-4 p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                          >
                            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md group-hover:scale-105 transition-all">
                              {expandedItems.includes(ano) ? (
                                <FolderOpen className="w-6 h-6" />
                              ) : (
                                <Folder className="w-6 h-6" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline gap-3">
                                <span className="font-semibold text-xl text-gray-900 dark:text-white">{ano}</span>
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/50">
                                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                    {contagem}
                                  </span>
                                  <span className="text-sm text-blue-600 dark:text-blue-400">projetos</span>
                                </div>
                              </div>
                            </div>
                            <ChevronDown 
                              className={`w-6 h-6 text-gray-400 transition-transform duration-200 ${
                                expandedItems.includes(ano) ? 'rotate-180' : ''
                              } group-hover:text-blue-500`}
                            />
                          </button>
                          {expandedItems.includes(ano) && (
                            <div className="px-4 sm:px-6 pb-6">
                              <div className="space-y-4">
                                {/* Resumo dos status quando não há filtro ativo */}
                                {!statusFilter && (
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 pt-2 text-xs sm:text-sm">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                                      <span className="text-gray-600 dark:text-gray-400">Aprovados</span>
                                      <span className="font-medium text-gray-900 dark:text-gray-200">{contarProjetosPorStatus(projetosDoAno).aprovado}</span>
                                    </div>
                                    <div className="hidden sm:block w-px h-4 bg-gray-200 dark:bg-gray-700"></div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                                      <span className="text-gray-600 dark:text-gray-400">Arquivados</span>
                                      <span className="font-medium text-gray-900 dark:text-gray-200">{contarProjetosPorStatus(projetosDoAno).arquivado}</span>
                                    </div>
                                    <div className="hidden sm:block w-px h-4 bg-gray-200 dark:bg-gray-700"></div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                      <span className="text-gray-600 dark:text-gray-400">Em Andamento</span>
                                      <span className="font-medium text-gray-900 dark:text-gray-200">{contarProjetosPorStatus(projetosDoAno).em_andamento}</span>
                                    </div>
                                    <div className="hidden sm:block w-px h-4 bg-gray-200 dark:bg-gray-700"></div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                                      <span className="text-gray-600 dark:text-gray-400">Lei em Vigor</span>
                                      <span className="font-medium text-gray-900 dark:text-gray-200">{contarProjetosPorStatus(projetosDoAno).lei_em_vigor}</span>
                                    </div>
                                    <div className="hidden sm:block w-px h-4 bg-gray-200 dark:bg-gray-700"></div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-red-600"></div>
                                      <span className="text-gray-600 dark:text-gray-400">Vetados</span>
                                      <span className="font-medium text-gray-900 dark:text-gray-200">{contarProjetosPorStatus(projetosDoAno).vetado}</span>
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-4 pt-2">
                                  {projetosFiltrados.map((projeto) => (
                                    <div 
                                      key={projeto.uid}
                                      className="w-full group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
                                    >
                                      {/* Cabeçalho do Projeto */}
                                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 px-3 sm:px-6 py-3 sm:py-4 border-b border-blue-100 dark:border-blue-800">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                                          <div className="flex items-center gap-3 sm:gap-4">
                                            <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${
                                              projeto.status === 'aprovado' ? 'bg-green-600' :
                                              projeto.status === 'arquivado' ? 'bg-gray-600' :
                                              projeto.status === 'em_andamento' ? 'bg-blue-600' :
                                              projeto.status === 'lei_em_vigor' ? 'bg-purple-600' :
                                              'bg-red-600'
                                            } text-white shadow-md group-hover:scale-105 transition-all duration-200`}>
                                              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                                            </div>
                                            <div>
                                              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                                <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                                  Projeto {projeto.numero}/{projeto.ano}
                                                </span>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                  projeto.status === 'aprovado' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                                                  projeto.status === 'arquivado' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300' :
                                                  projeto.status === 'em_andamento' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                                                  projeto.status === 'lei_em_vigor' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' :
                                                  'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                                }`}>
                                                  {statusConfig[projeto.status].label}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                                <span>Protocolado em {formatarData(projeto.data_protocolo)}</span>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="flex-1 sm:flex-none bg-white/50 hover:bg-white dark:bg-gray-800/50 dark:hover:bg-gray-800 text-blue-600 hover:text-blue-700 px-2 sm:px-3"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleView(projeto.uid);
                                              }}
                                            >
                                              <Eye className="w-4 h-4" />
                                              <span className="hidden sm:inline ml-2">Visualizar</span>
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="flex-1 sm:flex-none bg-white/50 hover:bg-white dark:bg-gray-800/50 dark:hover:bg-gray-800 text-gray-600 hover:text-gray-700 px-2 sm:px-3"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/app/documentos/projetos-lei/${projeto.uid}/editar`);
                                              }}
                                            >
                                              <Edit2 className="w-4 h-4" />
                                              <span className="hidden sm:inline ml-2">Editar</span>
                                            </Button>

                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="flex-1 sm:flex-none bg-white/50 hover:bg-white dark:bg-gray-800/50 dark:hover:bg-gray-800 text-red-600 hover:text-red-700 px-2 sm:px-3"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setProjetoParaDeletar(projeto);
                                              }}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                              <span className="hidden sm:inline ml-2">Excluir</span>
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
                
                {Object.keys(projetos).length === 0 && !isLoading && (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      Nenhum projeto de lei encontrado.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Floating Action Button for mobile */}
      <div className="md:hidden fixed bottom-6 right-6">
        <Button
          onClick={() => navigate('/app/documentos/projetos-lei/upload')}
          size="icon"
          className="w-14 h-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <AlertDialog open={!!projetoParaDeletar} onOpenChange={(isOpen) => !isOpen && setProjetoParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O projeto <strong>{projetoParaDeletar?.titulo}</strong> será marcado como excluído e não poderá ser recuperado.
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
