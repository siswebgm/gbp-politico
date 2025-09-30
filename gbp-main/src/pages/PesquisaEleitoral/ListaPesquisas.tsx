import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Input } from '../../components/ui/input';
import { Search, Plus, BarChart2, Pencil, Trash2, Eye, X, ArrowLeft, Grid, List, Copy, Check, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { pesquisaEleitoralService, type PesquisaEleitoral } from '../../services/pesquisaEleitoralService';
import { useCompanyStore } from '../../store/useCompanyStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';


// Extendendo a interface PesquisaEleitoral para incluir campos adicionais
interface PesquisaComOpcoes extends PesquisaEleitoral {
  tipo_pesquisa: string;
  created_at: string;
  data_fim: string | null;
}

export function ListaPesquisas() {
  const navigate = useNavigate();
  const { company } = useCompanyStore();
  const [pesquisas, setPesquisas] = useState<PesquisaComOpcoes[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todas');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // Estado para controle de loading durante ações
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  // Estado para feedback de cópia
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pesquisaParaExcluir, setPesquisaParaExcluir] = useState<string | null>(null);

  // Função para copiar o link da pesquisa
  const copyToClipboard = (id: string) => {
    const url = `${window.location.origin}/pesquisa/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('Link copiado para a área de transferência!');
    });
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Carregar lista de pesquisas
  useEffect(() => {
    const carregarPesquisas = async () => {
      if (!company?.uid) return;
      
      setLoading(true);
      try {
        const data = await pesquisaEleitoralService.listar(company.uid);
        setPesquisas(data);
      } catch (error) {
        console.error('Erro ao carregar pesquisas:', error);
        toast.error('Erro ao carregar as pesquisas');
      } finally {
        setLoading(false);
      }
    };

    carregarPesquisas();
  }, [company?.uid]);

  const handleToggleStatus = async (uid: string, ativa: boolean) => {
    setLoadingStates(prev => ({ ...prev, [uid]: true }));
    try {
      const success = await pesquisaEleitoralService.toggleStatus(uid, ativa);
      if (success) {
        setPesquisas(pesquisas.map(p => 
          p.uid === uid ? { ...p, ativa } : p
        ));
        toast.success(`Pesquisa ${ativa ? 'ativada' : 'desativada'} com sucesso`);
      }
    } catch (error) {
      console.error('Erro ao alterar status da pesquisa:', error);
      toast.error('Erro ao alterar status da pesquisa');
    } finally {
      setLoadingStates(prev => ({ ...prev, [uid]: false }));
    }
  };

  const handleDeletePesquisa = (uid: string) => {
    setPesquisaParaExcluir(uid);
  };

  const confirmarExclusao = async () => {
    if (!pesquisaParaExcluir) return;
    
    try {
      const success = await pesquisaEleitoralService.excluir(pesquisaParaExcluir);
      if (success) {
        setPesquisas(pesquisas.filter(p => p.uid !== pesquisaParaExcluir));
        toast.success('Pesquisa excluída com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao excluir pesquisa:', error);
      toast.error('Erro ao excluir a pesquisa');
    } finally {
      setPesquisaParaExcluir(null);
    }
  };

  const cancelarExclusao = () => {
    setPesquisaParaExcluir(null);
  };

  const handleEditPesquisa = (uid: string) => {
    navigate(`/app/pesquisas/${uid}/editar`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('todas');
    setTipoFilter('todos');
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'todas' || tipoFilter !== 'todos';
  
  const pesquisasFiltradas = pesquisas.filter(pesquisa => {
    const matchesSearch = pesquisa.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (pesquisa.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === 'todas' || 
                         (statusFilter === 'ativas' && pesquisa.ativa) ||
                         (statusFilter === 'inativas' && !pesquisa.ativa);
    
    const matchesTipo = tipoFilter === 'todos' || 
                       pesquisa.tipo_pesquisa === tipoFilter;
    
    return matchesSearch && matchesStatus && matchesTipo;
  });
  
  const formatarData = (data: string) => {
    try {
      return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      return 'Data inválida';
    }
  };

  const filteredPesquisas = pesquisasFiltradas as PesquisaComOpcoes[];
  

  const getStatusBadge = (ativa: boolean) => {
    return ativa ? (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Ativa</Badge>
    ) : (
      <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Inativa</Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Função para formatar o tipo de pesquisa
  const formatTipoPesquisa = (tipo: string) => {
    const tipos: Record<string, string> = {
      'eleitoral': 'Eleitoral',
      'satisfacao': 'Satisfação',
      'opiniao': 'Opinião Pública',
      'outros': 'Outros'
    };
    return tipos[tipo] || 'Não definido';
  };

  // Função para retornar a cor baseada no tipo de pesquisa
  const getCorTipoPesquisa = (tipo: string) => {
    const cores: Record<string, { bg: string, text: string, border: string }> = {
      'eleitoral': { 
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800'
      },
      'satisfacao': { 
        bg: 'bg-green-50 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-200 dark:border-green-800'
      },
      'opiniao': { 
        bg: 'bg-purple-50 dark:bg-purple-900/30',
        text: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-200 dark:border-purple-800'
      },
      'outros': { 
        bg: 'bg-gray-50 dark:bg-gray-800/30',
        text: 'text-gray-700 dark:text-gray-300',
        border: 'border-gray-200 dark:border-gray-700'
      }
    };
    
    return cores[tipo] || { 
      bg: 'bg-gray-50 dark:bg-gray-800/30',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-700'
    };
  };

  // Função para baixar o QR Code
  const downloadQRCode = async (pesquisaUid: string) => {
    try {
      const node = document.getElementById(`qrcode-${pesquisaUid}`);
      if (!node) return;
      
      const dataUrl = await toPng(node);
      const link = document.createElement('a');
      link.download = `qrcode-${pesquisaUid}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('QR Code baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao baixar QR Code:', error);
      toast.error('Erro ao baixar o QR Code');
    }
  };

  // Componente para renderizar um card de pesquisa
  const renderPesquisaCard = (pesquisa: PesquisaComOpcoes) => (
    <Card key={pesquisa.uid} className="flex flex-col h-full transition-all duration-200 border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md hover:border-primary-300 hover:dark:border-primary-500/50">
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between items-start space-x-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white leading-tight line-clamp-2">
                {pesquisa.titulo}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5">
                <Switch
                  id={`status-${pesquisa.uid}`}
                  checked={pesquisa.ativa}
                  onCheckedChange={(checked) => handleToggleStatus(pesquisa.uid, checked)}
                  disabled={loadingStates[pesquisa.uid]}
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                />
                <label 
                  htmlFor={`status-${pesquisa.uid}`} 
                  className="text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer"
                >
                  {pesquisa.ativa ? 'Ativa' : 'Inativa'}
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800 px-2 py-0.5">
              {formatTipoPesquisa(pesquisa.tipo_pesquisa || 'pesquisa')}
            </Badge>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Criada em {formatarData(pesquisa.created_at)}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow px-5 pb-4">
        <div className="space-y-4">
          {/* Descrição */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
              {pesquisa.descricao || 'Nenhuma descrição fornecida'}
            </p>
          </div>
          
          {/* Informações adicionais */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">Tipo</span>
              <Badge 
                variant="outline" 
                className={`text-xs font-normal w-full justify-center ${getCorTipoPesquisa(pesquisa.tipo_pesquisa).bg} ${getCorTipoPesquisa(pesquisa.tipo_pesquisa).text} ${getCorTipoPesquisa(pesquisa.tipo_pesquisa).border}`}
              >
                {formatTipoPesquisa(pesquisa.tipo_pesquisa || 'pesquisa')}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                {pesquisa.data_fim ? 'Encerra em' : 'Criada em'}
              </span>
              <div className="text-sm text-gray-900 dark:text-white font-medium">
                {formatarData(pesquisa.data_fim || pesquisa.created_at)}
              </div>
            </div>
          </div>
          
          {/* Link copiável */}
          <div className="relative">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs h-9 px-3 flex items-center justify-between group"
              onClick={() => copyToClipboard(pesquisa.uid)}
              title={`Copiar link da pesquisa: ${window.location.host}/pesquisa/${pesquisa.uid}`}
            >
              <span className="truncate text-left flex-1 pr-2">
                {window.location.host}/pesquisa/{pesquisa.uid}
              </span>
              {copiedId === pesquisa.uid ? (
                <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 flex-shrink-0 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              )}
            </Button>
          </div>
          
          {/* QR Code */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex flex-col items-center">
              <div id={`qrcode-${pesquisa.uid}`} className="p-2 bg-white rounded-md border border-gray-200 shadow-sm">
                <QRCodeSVG 
                  value={`${window.location.origin}/pesquisa/${pesquisa.uid}`}
                  size={90}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400 mb-1">
                Aponte a câmera para escanear
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7 px-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={() => downloadQRCode(pesquisa.uid)}
              >
                <Download className="h-3 w-3 mr-1.5" />
                QR Code
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="border-t dark:border-gray-700 p-2.5 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex justify-between w-full items-center">
          <div className="flex space-x-1.5">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 px-2.5 text-xs flex items-center gap-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70"
              onClick={() => handleEditPesquisa(pesquisa.uid)}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 px-2.5 text-xs flex items-center gap-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70"
              onClick={() => navigate(`/app/pesquisas/${pesquisa.uid}`)}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Visualizar</span>
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={(e) => {
              e.stopPropagation();
              handleDeletePesquisa(pesquisa.uid);
            }}
            title="Excluir pesquisa"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );

  // Componente para renderizar uma linha de pesquisa
  const renderPesquisaRow = (pesquisa: PesquisaEleitoral) => (
    <div key={pesquisa.uid} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
              {pesquisa.titulo}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleStatus(pesquisa.uid, !pesquisa.ativa);
                }}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${pesquisa.ativa ? 'bg-green-500' : 'bg-gray-200'}`}
                disabled={loadingStates[pesquisa.uid]}
              >
                <span
                  className={`${pesquisa.ativa ? 'translate-x-5' : 'translate-x-0.5'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </button>
              {getStatusBadge(pesquisa.ativa)}
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {pesquisa.descricao || 'Nenhuma descrição fornecida'}
          </p>
          <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span>{pesquisa.data_fim ? 'Encerra' : 'Criada'} em {formatarData(pesquisa.data_fim || pesquisa.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center text-xs"
            onClick={() => handleEditPesquisa(pesquisa.uid)}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center text-xs"
            onClick={() => navigate(`/app/pesquisas/${pesquisa.uid}`)}
          >
            <Eye className="h-3 w-3 mr-1" />
            Visualizar
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:text-red-400 p-2"
            onClick={() => handleDeletePesquisa(pesquisa.uid)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="pb-6">
            <div className="mx-auto sm:px-0 md:px-0">
              {/* Header Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4">
                  {/* Título e Descrição */}
                  <div className="flex items-center gap-4">
                    <Link
                      to="/app"
                      className="inline-flex items-center justify-center w-10 h-10 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Link>

                    <div>
                      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Painel de Pesquisas
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {pesquisas.length}
                        </span>
                      </h1>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Gerencie suas pesquisas e acompanhe os resultados
                      </p>
                    </div>
                  </div>

                  {/* Grupo de Botões */}
                  <div className="hidden md:flex items-center gap-3">
                    {/* Botão de Visualização */}
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-2 text-sm font-medium rounded-l-lg border ${viewMode === 'grid' 
                          ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900/50 dark:text-primary-200 dark:border-primary-700' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'}`}
                        title="Visualização em grade"
                      >
                        <Grid className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-2 text-sm font-medium rounded-r-lg border ${viewMode === 'list' 
                          ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900/50 dark:text-primary-200 dark:border-primary-700' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'}`}
                        title="Visualização em lista"
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Botão Nova Pesquisa - Visível apenas em desktop */}
                    <div className="hidden md:block">
                      <Button
                        onClick={() => navigate('/app/pesquisas/nova')}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-transparent text-sm font-medium text-white bg-primary-600 shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Pesquisa
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barra de Busca e Filtros - Design Moderno */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 mt-6 mx-5 border border-gray-100 dark:border-gray-700/50 transition-all duration-200 hover:shadow-md">
                <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filtros e Busca</h3>
                  
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center transition-colors duration-200"
                    >
                      Limpar filtros
                      <X className="ml-1 h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Campo de Busca */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-500 transition-colors">
                      <Search className="h-4 w-4" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Buscar pesquisas..."
                      className="pl-10 w-full transition-all duration-200 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  {/* Filtro de Status */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="appearance-none w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2.5 pl-3 pr-10 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 cursor-pointer"
                    >
                      <option value="todas">Todas as situações</option>
                      <option value="ativas">Ativas</option>
                      <option value="inativas">Inativas</option>
                    </select>
                  </div>
                  
                  {/* Filtro de Tipo */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <select
                      value={tipoFilter}
                      onChange={(e) => setTipoFilter(e.target.value)}
                      className="appearance-none w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2.5 pl-3 pr-10 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 cursor-pointer"
                    >
                      <option value="todos">Todos os tipos</option>
                      <option value="eleitoral">Eleitoral</option>
                      <option value="satisfacao">Satisfação</option>
                      <option value="opiniao">Opinião Pública</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                  
                </div>
              </div>

              {/* View Toggle for Mobile */}
              <div className="md:hidden flex justify-end mt-4 px-4">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 text-sm font-medium rounded-l-lg border ${viewMode === 'grid' 
                      ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900/50 dark:text-primary-200 dark:border-primary-700' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'}`}
                    title="Visualização em grade"
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 text-sm font-medium rounded-r-lg border ${viewMode === 'list' 
                      ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900/50 dark:text-primary-200 dark:border-primary-700' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'}`}
                    title="Visualização em lista"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Main Content */}
              <div className="mt-6">
                {filteredPesquisas.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mx-5">
                    <BarChart2 className="h-12 w-12 mx-auto text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Nenhuma pesquisa encontrada</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'Nenhuma pesquisa corresponde à sua busca.' : 'Comece criando uma nova pesquisa.'}
                    </p>
                    <div className="mt-6">
                      <Button 
                        onClick={() => navigate('/app/pesquisas/nova')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Pesquisa
                      </Button>
                    </div>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mx-5">
                    {filteredPesquisas.map(renderPesquisaCard)}
                  </div>
                ) : (
                  <div className="space-y-4 mx-5">
                    {filteredPesquisas.map(renderPesquisaRow)}
                  </div>
                )}
              </div>

              {/* Mobile Action Button */}
              {isMobile && (
                <div className="fixed bottom-6 right-6">
                  <button
                    onClick={() => navigate('/app/pesquisas/nova')}
                    className="w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors duration-200"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de Confirmação de Exclusão */}
        <AlertDialog open={!!pesquisaParaExcluir} onOpenChange={(open) => !open && setPesquisaParaExcluir(null)}>
          <AlertDialogContent className="sm:max-w-[425px]">
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <AlertDialogTitle className="text-left">Excluir pesquisa</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-left pt-3">
                Tem certeza que deseja excluir esta pesquisa? 
                <span className="block mt-2 text-red-600 dark:text-red-400 font-medium">
                  Esta ação não pode ser desfeita.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 sm:mt-0">
              <AlertDialogCancel 
                onClick={cancelarExclusao}
                className="mt-0"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmarExclusao}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
              >
                Sim, excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default ListaPesquisas;
