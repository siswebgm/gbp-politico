import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Share2, 
  Star, 
  XCircle, 
  ImageIcon, 
  ChevronLeft, 
  CalendarDays, 
  MapPin, 
  User, 
  FileText,
  AlertCircle,
  Trash2,
  Clock,
  MessageCircle,
  Archive,
  ArchiveRestore,
  RefreshCw,
  Folder
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { demandasRuasService, type DemandaRua } from '@/services/demandasRuasService';
import { indicadoService, type Indicado } from '@/services/indicadoService';
import { useCompanyStore } from '@/store/useCompanyStore';
import { useAuth } from '@/providers/AuthProvider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings } from 'lucide-react';
import { DateInput } from '@/components/ui/date-input';

export function DemandasRuas() {
  const navigate = useNavigate();
  const { company } = useCompanyStore();
  const { user } = useAuth();
  const [demandas, setDemandas] = useState<DemandaRua[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [urgenciaFilter, setUrgenciaFilter] = useState<string>('todos');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [tipoDemandaFilter, setTipoDemandaFilter] = useState<string>('todos');
  const [cidadeFilter, setCidadeFilter] = useState<string>('todos');
  const [bairroFilter, setBairroFilter] = useState<string>('todos');
  const [nivelFavoritoFilter, setNivelFavoritoFilter] = useState<string>('todos');
  const [respostaFilter, setRespostaFilter] = useState<string>('todos'); // novo filtro
  const [indicadoFilter, setIndicadoFilter] = useState<string>('todos'); // filtro de indicados
  const [indicados, setIndicados] = useState<Indicado[]>([]);
  const [showArquivadas, setShowArquivadas] = useState(false); // mostrar arquivadas
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [demandaToDelete, setDemandaToDelete] = useState<DemandaRua | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [demandaToArchive, setDemandaToArchive] = useState<DemandaRua | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [pastaFilter, setPastaFilter] = useState<string>('todas');
  const [mostrarNovaPasta, setMostrarNovaPasta] = useState(false);
  const [nomePastaArquivo, setNomePastaArquivo] = useState('');
  const [pastasSelecionada, setPastasSelecionada] = useState('');

  // Carregar as demandas
  const loadDemandas = async () => {
    if (!company?.uid) return;
    
    setLoading(true);
    try {
      const data = await demandasRuasService.getDemandas(company.uid);
      console.log('Demandas carregadas:', data);
      // Log detalhado de cada demanda
      data.forEach((demanda, index) => {
        console.log(`Demanda ${index + 1}:`, {
          id: demanda.uid,
          requerente_nome: demanda.requerente_nome,
          requerente_uid: demanda.requerente_uid,
          campos: Object.keys(demanda).filter(key => key.includes('requerente'))
        });
      });
      setDemandas(data);
    } catch (error) {
      console.error('Erro ao carregar demandas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Configurar assinatura de mudanças em tempo real
  useEffect(() => {
    if (!company?.uid) return;
    
    // Carregar dados iniciais
    loadDemandas();
    
    // Inscrever para atualizações em tempo real
    const unsubscribe = demandasRuasService.subscribeToDemandas(
      company.uid,
      (payload) => {
        // Atualizar a lista quando houver mudanças
        loadDemandas();
      }
    );
    
    // Limpar assinatura ao desmontar o componente
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [company?.uid]);

  // Carregar indicados da empresa
  useEffect(() => {
    const loadIndicados = async () => {
      if (!company?.uid) return;
      
      try {
        const indicadosData = await indicadoService.listByEmpresa(company.uid);
        setIndicados(indicadosData);
      } catch (error) {
        console.error('Erro ao carregar indicados:', error);
      }
    };

    loadIndicados();
  }, [company?.uid]);

  // Extrair opções únicas para os filtros
  const { tiposDeDemanda, cidades } = React.useMemo(() => {
    const tipos = new Set<string>();
    const cidadesSet = new Set<string>();

    demandas.forEach(d => {
      if (d.tipo_de_demanda) tipos.add(d.tipo_de_demanda);
      if (d.cidade) cidadesSet.add(d.cidade);
    });

    return {
      tiposDeDemanda: Array.from(tipos).sort(),
      cidades: Array.from(cidadesSet).sort(),
    };
  }, [demandas]);

  const bairros = React.useMemo(() => {
    const bairrosSet = new Set<string>();
    const demandasDaCidade = cidadeFilter === 'todos' 
      ? demandas 
      : demandas.filter(d => d.cidade === cidadeFilter);

    demandasDaCidade.forEach(d => {
      if (d.bairro) bairrosSet.add(d.bairro);
    });

    return Array.from(bairrosSet).sort();
  }, [demandas, cidadeFilter]);

  // Resetar filtro de bairro ao mudar a cidade
  useEffect(() => {
    setBairroFilter('todos');
  }, [cidadeFilter]);

  // Filtrar demandas por data
  const filterByDate = (dateString: string) => {
    if (!dataInicio && !dataFim) return true;
    
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    
    if (dataInicio && dataFim) {
      const inicio = new Date(dataInicio);
      inicio.setHours(0, 0, 0, 0);
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
      return date >= inicio && date <= fim;
    } else if (dataInicio) {
      const inicio = new Date(dataInicio);
      inicio.setHours(0, 0, 0, 0);
      return date >= inicio;
    } else if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
      return date <= fim;
    }
    
    return true;
  };

  // Extrair pastas únicas das demandas arquivadas
  const pastasArquivo = Array.from(
    new Set(
      demandas
        .filter(d => d.arquivado && d.pasta_arquivo)
        .map(d => d.pasta_arquivo)
    )
  ).sort();

  // Filtrar demandas
  const filteredDemandas = demandas.filter(demanda => {
    const matchesSearch = 
      (demanda.descricao_do_problema?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (demanda.logradouro?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (demanda.bairro?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (demanda.numero_protocolo?.toString().includes(searchTerm) ?? false) ||
      (demanda.requerente?.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

    const matchesStatus = statusFilter === 'todos' || demanda.status === statusFilter;
    const matchesUrgencia = urgenciaFilter === 'todos' || demanda.nivel_de_urgencia === urgenciaFilter;
    const matchesDate = filterByDate(demanda.criado_em);
    // Filtro unificado de nível/favorito
    const matchesNivelFavorito = nivelFavoritoFilter === 'todos' || 
      (nivelFavoritoFilter === 'favoritos' && demanda.nivel_favorito && demanda.nivel_favorito > 0) ||
      (nivelFavoritoFilter === '0' && (!demanda.nivel_favorito || demanda.nivel_favorito === 0)) ||
      (demanda.nivel_favorito && demanda.nivel_favorito.toString() === nivelFavoritoFilter);
    const matchesTipoDemanda = tipoDemandaFilter === 'todos' || demanda.tipo_de_demanda === tipoDemandaFilter;
    const matchesCidade = cidadeFilter === 'todos' || demanda.cidade === cidadeFilter;
    const matchesBairro = bairroFilter === 'todos' || demanda.bairro === bairroFilter;
    const matchesResposta = respostaFilter === 'todos' || 
      (respostaFilter === 'respondidas' && demanda.tem_resposta_whatsapp) ||
      (respostaFilter === 'nao_respondidas' && !demanda.tem_resposta_whatsapp);
    const matchesIndicado = indicadoFilter === 'todos' || 
      (indicadoFilter === 'sem_indicado' && !demanda.indicado_uid) ||
      (indicadoFilter !== 'sem_indicado' && demanda.indicado_uid === indicadoFilter);
    // Filtro de arquivadas: 
    // se showArquivadas = true, mostra APENAS arquivadas
    // se showArquivadas = false, mostra APENAS não arquivadas
    const matchesArquivadas = showArquivadas ? demanda.arquivado : !demanda.arquivado;
    // Filtro de pasta: só aplica quando showArquivadas está ativo
    const matchesPasta = !showArquivadas || pastaFilter === 'todas' || demanda.pasta_arquivo === pastaFilter;

    return matchesSearch && matchesStatus && matchesUrgencia && matchesDate && matchesNivelFavorito && matchesTipoDemanda && matchesCidade && matchesBairro && matchesResposta && matchesIndicado && matchesArquivadas && matchesPasta;
  });

  // Formatar data
  const handleToggleFavorito = async (e: React.MouseEvent, demanda: DemandaRua) => {
    e.stopPropagation();
    try {
      // Ciclar entre os níveis: 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 0
      const nivelAtual = demanda.nivel_favorito || 0;
      const novoNivel = nivelAtual >= 5 ? 0 : nivelAtual + 1;
      
      await demandasRuasService.setNivelFavorito(demanda.uid, novoNivel);
      setDemandas(demandas.map(d => 
        d.uid === demanda.uid ? { 
          ...d, 
          nivel_favorito: novoNivel,
          favorito: novoNivel > 0 
        } : d
      ));
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
    }
  };

  // Definir nível de favorito diretamente
  const handleSetNivelFavorito = async (demanda: DemandaRua, nivel: number) => {
    try {
      await demandasRuasService.setNivelFavorito(demanda.uid, nivel);
      setDemandas(demandas.map(d => 
        d.uid === demanda.uid ? { 
          ...d, 
          nivel_favorito: nivel,
          favorito: nivel > 0 
        } : d
      ));
    } catch (error) {
      console.error('Erro ao atualizar nível de favorito:', error);
    }
  };

  // Abrir modal de confirmação de arquivamento
  const handleOpenArchiveModal = (e: React.MouseEvent, demanda: DemandaRua) => {
    e.stopPropagation();
    setDemandaToArchive(demanda);
    setPastasSelecionada(demanda.pasta_arquivo || '');
    setNomePastaArquivo('');
    setMostrarNovaPasta(false);
    setShowArchiveModal(true);
  };

  // Confirmar arquivamento
  const handleConfirmArchive = async () => {
    if (!demandaToArchive) return;
    
    // Determinar o nome da pasta
    let nomePasta = '';
    if (mostrarNovaPasta) {
      nomePasta = nomePastaArquivo.trim();
    } else {
      nomePasta = pastasSelecionada;
    }
    
    // Se está arquivando e não tem nome de pasta, exige
    if (!demandaToArchive.arquivado && !nomePasta) {
      alert('Por favor, selecione ou digite o nome da pasta de arquivamento');
      return;
    }
    
    try {
      const novoEstado = !demandaToArchive.arquivado;
      await demandasRuasService.setArquivado(
        demandaToArchive.uid, 
        novoEstado,
        novoEstado ? nomePasta : undefined
      );
      
      // Atualizar estado local imediatamente
      setDemandas(demandas.map(d => 
        d.uid === demandaToArchive.uid ? { 
          ...d, 
          arquivado: novoEstado,
          pasta_arquivo: novoEstado ? nomePasta : null
        } : d
      ));
      
      setShowArchiveModal(false);
      setDemandaToArchive(null);
      setNomePastaArquivo('');
      setPastasSelecionada('');
      setMostrarNovaPasta(false);
      
      // Recarregar dados do servidor para garantir sincronização
      await loadDemandas();
    } catch (error) {
      console.error('Erro ao arquivar/desarquivar demanda:', error);
    }
  };

  // Função para abrir modal de confirmação de exclusão
  const handleOpenDeleteModal = (e: React.MouseEvent, demanda: DemandaRua) => {
    e.stopPropagation();
    setDemandaToDelete(demanda);
    setShowDeleteModal(true);
  };

  // Função para fechar modal de exclusão
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDemandaToDelete(null);
  };

  // Função para deletar demanda (soft delete)
  const handleDeleteDemanda = async () => {
    if (!demandaToDelete || !user) return;

    setIsDeleting(true);
    try {
      // Soft delete: marca como excluído mas não remove do banco
      await demandasRuasService.deleteDemanda(
        demandaToDelete.uid,
        user.uid,
        user.nome
      );
      
      // Remove da listagem local
      setDemandas(demandas.filter(d => d.uid !== demandaToDelete.uid));
      handleCloseDeleteModal();
    } catch (error) {
      console.error('Erro ao deletar demanda:', error);
      alert('Erro ao deletar demanda. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  // Função para obter cor e estilo da estrela baseado no nível
  const getStarStyle = (nivel: number) => {
    switch (nivel) {
      case 1:
        return { color: 'text-blue-500', fill: 'fill-blue-500', label: 'Nível 1' };
      case 2:
        return { color: 'text-green-500', fill: 'fill-green-500', label: 'Nível 2' };
      case 3:
        return { color: 'text-yellow-500', fill: 'fill-yellow-500', label: 'Nível 3' };
      case 4:
        return { color: 'text-orange-500', fill: 'fill-orange-500', label: 'Nível 4' };
      case 5:
        return { color: 'text-red-500', fill: 'fill-red-500', label: 'Nível 5 - Urgente' };
      default:
        return { color: 'text-gray-400', fill: '', label: 'Não marcado' };
    }
  };

  // Funções auxiliares
  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'recebido':
      case 'feito_oficio':
        return 'bg-blue-500';
      case 'protocolado':
      case 'aguardando':
        return 'bg-yellow-500';
      case 'concluido':
        return 'bg-green-500';
      case 'cancelado':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getUrgenciaTextColor = (urgencia: string) => {
    switch (urgencia) {
      case 'alta':
        return 'text-red-600 dark:text-red-400';
      case 'média':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'baixa':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-foreground';
    }
  };

  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'recebido':
      case 'feito_oficio':
        return 'from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/10';
      case 'protocolado':
      case 'aguardando':
        return 'from-yellow-50 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-900/10';
      case 'concluido':
        return 'from-green-50 to-green-50 dark:from-green-900/20 dark:to-green-900/10';
      case 'cancelado':
        return 'from-red-50 to-red-50 dark:from-red-900/20 dark:to-red-900/10';
      default:
        return 'from-gray-50 to-gray-50 dark:from-gray-800/20 dark:to-gray-800/10';
    }
  };

  // Obter cor do badge de urgência
  const getUrgenciaBadgeVariant = (urgencia: string) => {
    switch (urgencia) {
      case 'alta':
        return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'média':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'baixa':
        return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const openFullscreenImage = (image: string) => {
    setFullscreenImage(image);
  };

  const closeFullscreenImage = () => {
    setFullscreenImage(null);
  };

  if (loading && demandas.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      
      <div className="flex-1 py-2 md:py-6 px-2 md:px-4 pb-24 md:pb-6">
        <div className="flex flex-col space-y-2 md:space-y-4">
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
            <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigate('/app/documentos')} 
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  aria-label="Voltar para Documentos"
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-500 dark:text-gray-400" />
                </button>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  Demandas das Ruas
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/app/documentos/demandas-ruas/relatorios')}
                  className="h-9 hidden md:flex items-center bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-800/30 dark:text-blue-300"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Relatórios
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/app/documentos/demandas-ruas/configuracoes')}
                  className="h-9 hidden md:flex items-center bg-gray-50 hover:bg-gray-100 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </Button>
              </div>
            </div>
            <div className="flex items-baseline gap-2 ml-8">
              <p className="text-muted-foreground">Gerencie as demandas da cidade</p>
            </div>
          </div>
          </div>

          {/* Main Content */}
          <div className="space-y-2">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="space-y-3">
                  {/* Barra de busca e ações */}
                  <div className="flex flex-col gap-3 w-full">
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar demandas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Filtro unificado de Favorito/Nível */}
                        <Select value={nivelFavoritoFilter} onValueChange={setNivelFavoritoFilter}>
                          <SelectTrigger className={`h-9 flex-1 min-w-[140px] text-xs transition-colors ${
                            nivelFavoritoFilter !== 'todos' ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700' : ''
                          }`}>
                            <div className="flex items-center gap-2">
                              <Star className={`h-4 w-4 ${
                                nivelFavoritoFilter === 'favoritos' ? 'fill-yellow-400 text-yellow-500' :
                                nivelFavoritoFilter === '1' ? 'fill-blue-500 text-blue-500' :
                                nivelFavoritoFilter === '2' ? 'fill-green-500 text-green-500' :
                                nivelFavoritoFilter === '3' ? 'fill-yellow-500 text-yellow-500' :
                                nivelFavoritoFilter === '4' ? 'fill-orange-500 text-orange-500' :
                                nivelFavoritoFilter === '5' ? 'fill-red-500 text-red-500' :
                                nivelFavoritoFilter === '0' ? 'text-gray-400' : ''
                              }`} />
                              <span className="truncate">
                                {nivelFavoritoFilter === 'todos' ? 'Favoritos' :
                                 nivelFavoritoFilter === 'favoritos' ? 'Mostrar favoritos' :
                                 nivelFavoritoFilter === '0' ? 'Não marcado' :
                                 `Nível ${nivelFavoritoFilter}`}
                              </span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos" className="text-xs">Todos</SelectItem>
                            <SelectItem value="favoritos" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-500" />
                                <span>Mostrar favoritos</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="0" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Star className="w-3 h-3 text-gray-400" />
                                <span>Não marcado</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="1" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Star className="w-3 h-3 fill-blue-500 text-blue-500" />
                                <span>Nível 1</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="2" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Star className="w-3 h-3 fill-green-500 text-green-500" />
                                <span>Nível 2</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="3" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                <span>Nível 3</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="4" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Star className="w-3 h-3 fill-orange-500 text-orange-500" />
                                <span>Nível 4</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="5" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Star className="w-3 h-3 fill-red-500 text-red-500" />
                                <span>Nível 5</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Botão/Select de Arquivadas com filtro de pasta integrado */}
                        <Select 
                          value={showArquivadas ? pastaFilter : 'ocultar'} 
                          onValueChange={(value) => {
                            if (value === 'ocultar') {
                              setShowArquivadas(false);
                              setPastaFilter('todas');
                            } else {
                              setShowArquivadas(true);
                              setPastaFilter(value);
                            }
                          }}
                        >
                          <SelectTrigger className={`h-9 flex-1 min-w-[120px] text-xs transition-colors ${
                            showArquivadas ? 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200' : ''
                          }`}>
                            <div className="flex items-center gap-2">
                              <Archive className={`h-4 w-4 ${showArquivadas ? 'fill-blue-400' : ''}`} />
                              <span className="truncate">
                                {!showArquivadas ? 'Arquivadas' : 
                                 pastaFilter === 'todas' ? 'Todas as pastas' : 
                                 pastaFilter}
                              </span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ocultar" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Archive className="h-3.5 w-3.5" />
                                <span>Ocultar arquivadas</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="todas" className="text-xs font-medium">
                              <div className="flex items-center gap-2">
                                <Archive className="h-3.5 w-3.5 fill-blue-400 text-blue-600" />
                                <span>Todas as pastas</span>
                              </div>
                            </SelectItem>
                            {pastasArquivo.length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">Pastas:</div>
                                {pastasArquivo.map(pasta => (
                                  <SelectItem key={pasta} value={pasta} className="text-xs pl-6">
                                    <div className="flex items-center gap-2">
                                      <Folder className="h-3.5 w-3.5 text-blue-600" />
                                      <span>{pasta}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>

                        {/* Filtro de Data Início */}
                        <div className="flex-1 min-w-[130px]">
                          <DateInput
                            value={dataInicio}
                            onChange={setDataInicio}
                            placeholder="Data início"
                            className="w-full pr-3 h-9 text-xs"
                          />
                        </div>

                        {/* Filtro de Data Fim */}
                        <div className="flex-1 min-w-[130px]">
                          <DateInput
                            value={dataFim}
                            onChange={setDataFim}
                            placeholder="Data fim"
                            className="w-full pr-3 h-9 text-xs"
                          />
                        </div>
                    </div>
                  </div>
                  
                  {/* Filtros */}
                  <div className="flex flex-wrap gap-2">
                    {/* Filtro de Status */}
                    <div className="flex-1 min-w-[120px]">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full text-xs sm:text-sm h-9">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              statusFilter === 'todos' ? 'bg-gray-300' : 
                              statusFilter === 'recebido' ? 'bg-blue-500' :
                              statusFilter === 'feito_oficio' ? 'bg-blue-400' :
                              statusFilter === 'protocolado' ? 'bg-yellow-500' :
                              statusFilter === 'aguardando' ? 'bg-yellow-400' :
                              statusFilter === 'concluido' ? 'bg-green-500' : 'bg-red-500'}`} 
                            />
                            <span className="truncate">
                              {statusFilter === 'todos' ? 'Status' : 
                               statusFilter === 'recebido' ? 'Recebido' :
                               statusFilter === 'feito_oficio' ? 'Feito Ofício' :
                               statusFilter === 'protocolado' ? 'Protocolado' :
                               statusFilter === 'aguardando' ? 'Aguardando' :
                               statusFilter === 'concluido' ? 'Concluído' : 'Cancelado'}
                            </span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos" className="text-xs sm:text-sm">Todos os status</SelectItem>
                          <SelectItem value="recebido" className="text-xs sm:text-sm">Recebido</SelectItem>
                          <SelectItem value="feito_oficio" className="text-xs sm:text-sm">Feito Ofício</SelectItem>
                          <SelectItem value="protocolado" className="text-xs sm:text-sm">Protocolado</SelectItem>
                          <SelectItem value="aguardando" className="text-xs sm:text-sm">Aguardando</SelectItem>
                          <SelectItem value="concluido" className="text-xs sm:text-sm">Concluído</SelectItem>
                          <SelectItem value="cancelado" className="text-xs sm:text-sm">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Filtro de Urgência */}
                    <div className="flex-1 min-w-[120px]">
                      <Select value={urgenciaFilter} onValueChange={setUrgenciaFilter}>
                        <SelectTrigger className="w-full text-xs sm:text-sm h-9">
                          <div className="flex items-center gap-2">
                            {urgenciaFilter === 'baixa' ? <AlertCircle className="h-3.5 w-3.5 text-green-500" /> : 
                             urgenciaFilter === 'média' ? <AlertCircle className="h-3.5 w-3.5 text-yellow-500" /> : 
                             urgenciaFilter === 'alta' ? <AlertCircle className="h-3.5 w-3.5 text-red-500" /> : 
                             <AlertCircle className="h-3.5 w-3.5 text-gray-400" />}
                            <span className="truncate">
                              {urgenciaFilter === 'todos' ? 'Urgência' : 
                               urgenciaFilter === 'baixa' ? 'Baixa' :
                               urgenciaFilter === 'média' ? 'Média' : 'Alta'}
                            </span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos" className="text-xs sm:text-sm">Todas as urgências</SelectItem>
                          <SelectItem value="baixa" className="text-xs sm:text-sm">Baixa</SelectItem>
                          <SelectItem value="média" className="text-xs sm:text-sm">Média</SelectItem>
                          <SelectItem value="alta" className="text-xs sm:text-sm">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Filtro de Período */}
                    {/* Filtro de Tipo de Demanda */}
                    <div className="flex-1 min-w-[150px]">
                      <Select value={tipoDemandaFilter} onValueChange={setTipoDemandaFilter}>
                        <SelectTrigger className="w-full text-xs sm:text-sm h-9">
                          <span className="truncate">{tipoDemandaFilter === 'todos' ? 'Tipo de Demanda' : tipoDemandaFilter.split('::').pop()}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os tipos</SelectItem>
                          {tiposDeDemanda.map(tipo => (
                            <SelectItem key={tipo} value={tipo}>{tipo.split('::').pop()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro de Cidade */}
                    <div className="flex-1 min-w-[120px]">
                      <Select value={cidadeFilter} onValueChange={setCidadeFilter}>
                        <SelectTrigger className="w-full text-xs sm:text-sm h-9">
                          <span className="truncate">{cidadeFilter === 'todos' ? 'Cidade' : cidadeFilter}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas as cidades</SelectItem>
                          {cidades.map(cidade => (
                            <SelectItem key={cidade} value={cidade}>{cidade}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro de Bairro */}
                    <div className="flex-1 min-w-[120px]">
                      <Select value={bairroFilter} onValueChange={setBairroFilter} disabled={cidadeFilter === 'todos' && bairros.length === 0}>
                        <SelectTrigger className="w-full text-xs sm:text-sm h-9">
                          <span className="truncate">{bairroFilter === 'todos' ? 'Bairro' : bairroFilter}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os bairros</SelectItem>
                          {bairros.map(bairro => (
                            <SelectItem key={bairro} value={bairro}>{bairro}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro de Resposta */}
                    <div className="flex-1 min-w-[140px]">
                      <Select value={respostaFilter} onValueChange={setRespostaFilter}>
                        <SelectTrigger className="w-full text-xs sm:text-sm h-9">
                          <div className="flex items-center gap-2">
                            <MessageCircle className={`h-3.5 w-3.5 ${
                              respostaFilter === 'respondidas' ? 'text-green-600' :
                              respostaFilter === 'nao_respondidas' ? 'text-orange-600' :
                              'text-gray-400'
                            }`} />
                            <span className="truncate">
                              {respostaFilter === 'todos' ? 'Resposta' : 
                               respostaFilter === 'respondidas' ? 'Respondidas' : 'Não respondidas'}
                            </span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos" className="text-xs sm:text-sm">Todas</SelectItem>
                          <SelectItem value="respondidas" className="text-xs sm:text-sm">Respondidas</SelectItem>
                          <SelectItem value="nao_respondidas" className="text-xs sm:text-sm">Não respondidas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro de Indicado */}
                    <div className="flex-1 min-w-[150px]">
                      <Select value={indicadoFilter} onValueChange={setIndicadoFilter}>
                        <SelectTrigger className="w-full text-xs sm:text-sm h-9">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate">
                              {indicadoFilter === 'todos' ? 'Indicado' : 
                               indicadoFilter === 'sem_indicado' ? 'Sem indicado' :
                               indicados.find(i => i.uid === indicadoFilter)?.nome || 'Indicado'}
                            </span>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                          <SelectItem value="todos" className="text-xs sm:text-sm">Todos</SelectItem>
                          <SelectItem value="sem_indicado" className="text-xs sm:text-sm">Sem indicado</SelectItem>
                          {indicados
                            .filter(indicado => {
                              // Mostrar apenas indicados que têm pelo menos uma demanda
                              return demandas.some(d => d.indicado_uid === indicado.uid);
                            })
                            .map(indicado => (
                              <SelectItem key={indicado.uid} value={indicado.uid} className="text-xs sm:text-sm">
                                {indicado.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Botão Limpar Filtros */}
                    {(statusFilter !== 'todos' || urgenciaFilter !== 'todos' || dataInicio || dataFim || searchTerm || tipoDemandaFilter !== 'todos' || cidadeFilter !== 'todos' || bairroFilter !== 'todos' || nivelFavoritoFilter !== 'todos' || respostaFilter !== 'todos' || indicadoFilter !== 'todos' || showArquivadas) && (
                      <div className="ml-auto">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setStatusFilter('todos');
                            setUrgenciaFilter('todos');
                            setDataInicio('');
                            setDataFim('');
                            setSearchTerm('');
                            setTipoDemandaFilter('todos');
                            setCidadeFilter('todos');
                            setBairroFilter('todos');
                            setNivelFavoritoFilter('todos');
                            setRespostaFilter('todos');
                            setIndicadoFilter('todos');
                            setPastaFilter('todas');
                            setShowArquivadas(false);
                          }}
                          className="whitespace-nowrap text-xs sm:text-sm h-9 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                        >
                          Limpar filtros
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Banner de Arquivadas */}
                {showArquivadas && (
                  <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg dark:bg-blue-900/20 dark:border-blue-400">
                    <div className="flex items-center gap-3">
                      {pastaFilter === 'todas' ? (
                        <Archive className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      ) : (
                        <Folder className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      )}
                      <div>
                        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                          {pastaFilter === 'todas' 
                            ? 'Visualizando Demandas Arquivadas' 
                            : `Pasta: ${pastaFilter}`}
                        </h3>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          {pastaFilter === 'todas' 
                            ? 'Você está visualizando todas as demandas arquivadas de todas as pastas.'
                            : `Visualizando apenas demandas da pasta "${pastaFilter}".`}
                          {' '}Clique no botão "Arquivadas" e selecione "Ocultar arquivadas" para voltar às demandas ativas.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-8">
                  {filteredDemandas.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-6 lg:gap-8 pt-4">
                      {filteredDemandas.map((demanda) => (
                        <div 
                          key={demanda.uid}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-sm transition-all duration-200 bg-white dark:bg-gray-800 flex flex-col h-full"
                        >
                          {/* Área da Imagem */}
                          <div className="relative">
                            {/* Botões de Ação */}
                            <div className="absolute top-2 right-2 z-10 flex gap-2">
                              {/* Botão de Favorito com Nível - Popover */}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button 
                                    onClick={(e) => e.stopPropagation()}
                                    className="relative p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-sm hover:bg-white dark:hover:bg-gray-700 transition-colors"
                                    title={`${getStarStyle(demanda.nivel_favorito || 0).label} - Clique para escolher nível`}
                                  >
                                    <Star 
                                      className={`w-5 h-5 ${getStarStyle(demanda.nivel_favorito || 0).fill} ${getStarStyle(demanda.nivel_favorito || 0).color}`} 
                                    />
                                    {/* Badge com o número do nível - Só mostra se nivel > 0 */}
                                    {demanda.nivel_favorito > 0 && (
                                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-600">
                                        <span className={`text-[10px] font-bold ${getStarStyle(demanda.nivel_favorito).color}`}>
                                          {demanda.nivel_favorito}
                                        </span>
                                      </div>
                                    )}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent 
                                  className="w-56 p-2 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700" 
                                  onClick={(e) => e.stopPropagation()}
                                  align="end"
                                >
                                  <div className="space-y-1">
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2 py-1 mb-1">
                                      Selecione o nível de prioridade
                                    </p>
                                    
                                    {/* Opção: Remover favorito */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetNivelFavorito(demanda, 0);
                                      }}
                                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                                        (!demanda.nivel_favorito || demanda.nivel_favorito === 0) 
                                          ? 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600' 
                                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                      }`}
                                    >
                                      <Star className="w-4 h-4 text-gray-400" />
                                      <span className="text-sm font-medium">Não marcado</span>
                                    </button>

                                    {/* Nível 1 */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetNivelFavorito(demanda, 1);
                                      }}
                                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                                        demanda.nivel_favorito === 1 
                                          ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-600' 
                                          : 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                                      }`}
                                    >
                                      <Star className="w-4 h-4 fill-blue-500 text-blue-500" />
                                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Nível 1 - Baixa</span>
                                    </button>

                                    {/* Nível 2 */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetNivelFavorito(demanda, 2);
                                      }}
                                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                                        demanda.nivel_favorito === 2 
                                          ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600' 
                                          : 'bg-green-50/50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20'
                                      }`}
                                    >
                                      <Star className="w-4 h-4 fill-green-500 text-green-500" />
                                      <span className="text-sm font-medium text-green-700 dark:text-green-300">Nível 2 - Média-Baixa</span>
                                    </button>

                                    {/* Nível 3 */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetNivelFavorito(demanda, 3);
                                      }}
                                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                                        demanda.nivel_favorito === 3 
                                          ? 'bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400 dark:border-yellow-600' 
                                          : 'bg-yellow-50/50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                                      }`}
                                    >
                                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                      <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Nível 3 - Média</span>
                                    </button>

                                    {/* Nível 4 */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetNivelFavorito(demanda, 4);
                                      }}
                                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                                        demanda.nivel_favorito === 4 
                                          ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-400 dark:border-orange-600' 
                                          : 'bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20'
                                      }`}
                                    >
                                      <Star className="w-4 h-4 fill-orange-500 text-orange-500" />
                                      <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Nível 4 - Média-Alta</span>
                                    </button>

                                    {/* Nível 5 */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetNivelFavorito(demanda, 5);
                                      }}
                                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                                        demanda.nivel_favorito === 5 
                                          ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-400 dark:border-red-600' 
                                          : 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20'
                                      }`}
                                    >
                                      <Star className="w-4 h-4 fill-red-500 text-red-500" />
                                      <span className="text-sm font-bold text-red-700 dark:text-red-300">Nível 5 - Urgente</span>
                                    </button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                              
                              {/* Botão de Arquivar */}
                              <button 
                                onClick={(e) => handleOpenArchiveModal(e, demanda)}
                                className="p-1.5 bg-white/80 dark:bg-gray-800/80 rounded-full shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
                                title={demanda.arquivado ? "Desarquivar demanda" : "Arquivar demanda"}
                              >
                                {demanda.arquivado ? (
                                  <ArchiveRestore className="w-4 h-4 text-blue-600 group-hover:text-blue-700 transition-colors" />
                                ) : (
                                  <Archive className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                )}
                              </button>

                              {/* Botão de Excluir */}
                              <button 
                                onClick={(e) => handleOpenDeleteModal(e, demanda)}
                                className="p-1.5 bg-white/80 dark:bg-gray-800/80 rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
                                title="Excluir demanda"
                              >
                                <Trash2 
                                  className="w-4 h-4 text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors" 
                                />
                              </button>
                            </div>
                            
                            {demanda.fotos_do_problema && demanda.fotos_do_problema.length > 0 ? (
                              <div className="w-full">
                                <div className={`${demanda.fotos_do_problema && demanda.fotos_do_problema.length > 1 ? 'grid grid-cols-2 gap-1' : ''} w-full`}>
                                  {demanda.fotos_do_problema?.slice(0, 2).map((foto, index) => (
                                    <div 
                                      key={index} 
                                      className="relative h-40 bg-gray-100 dark:bg-gray-700/50 cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openFullscreenImage(foto);
                                      }}
                                    >
                                      <img 
                                        src={foto}
                                        alt={`Imagem ${index + 1} da demanda`}
                                        className="w-full h-full object-cover"
                                      />
                                      {index === 1 && demanda.fotos_do_problema && demanda.fotos_do_problema.length > 2 && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-medium">
                                          +{demanda.fotos_do_problema.length - 2} mais
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {demanda.fotos_do_problema && demanda.fotos_do_problema.length > 2 && (
                                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Mais fotos</p>
                                    <div className="grid grid-cols-2 gap-2">
                                      {demanda.fotos_do_problema.slice(2, 6).map((foto, index) => (
                                        <div 
                                          key={index} 
                                          className="h-24 bg-gray-100 dark:bg-gray-700/50 rounded overflow-hidden group"
                                        >
                                          <img 
                                            src={foto} 
                                            alt={`Imagem adicional ${index + 3}`}
                                            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                                          />
                                        </div>
                                      ))}
                                      {demanda.fotos_do_problema.length > 6 && (
                                        <div className="h-24 bg-gray-100 dark:bg-gray-700/30 rounded border border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center">
                                          <span className="text-xs text-muted-foreground">
                                            +{demanda.fotos_do_problema.length - 6}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-full h-32 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                              </div>
                            )}
                          </div>

                          {/* Cabeçalho do Card */}
                          <div className="px-5 pt-4">
                            <div className="space-y-3">
                              {/* Linha de status e data */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${getStatusDotColor(demanda.status)}`}></div>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {demanda.status ? demanda.status.replace('_', ' ') : 'Sem status'}
                                  </span>
                                </div>
                                <span className="text-xs font-medium text-muted-foreground/70 tracking-wider">
                                  INFRAESTRUTURA
                                </span>
                              </div>
                              
                              {/* Tipo de demanda */}
                              <h3 className="font-semibold text-[15px] leading-tight text-foreground">
                                {demanda.tipo_de_demanda?.replace('Infraestrutura::', '')}
                              </h3>
                            </div>
                          </div>

                          {/* Corpo do Card */}
                          <div className="px-5 pb-5 pt-3 space-y-4 flex-1 flex flex-col">
                            {/* Informações Principais */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm">
                                <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-foreground">
                                  {format(new Date(demanda.criado_em), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </span>
                              </div>

                              {/* Dias desde criação e Status de resposta - DESTACADO */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Dias desde criação - Badge */}
                                {(() => {
                                  const dias = Math.floor((new Date().getTime() - new Date(demanda.criado_em).getTime()) / (1000 * 60 * 60 * 24));
                                  const isAtrasado = dias > 30;
                                  const isRecente = dias <= 7;
                                  
                                  return (
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                                      isAtrasado 
                                        ? 'bg-red-100 text-red-700 border border-red-200' 
                                        : isRecente 
                                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                                    }`}>
                                      <Clock className="w-3.5 h-3.5" />
                                      <span className="text-xs font-semibold">
                                        {dias === 0 ? 'Hoje' : dias === 1 ? '1 dia' : `${dias} dias`}
                                      </span>
                                    </div>
                                  );
                                })()}

                                {/* Status de resposta - Badge */}
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                                  demanda.tem_resposta_whatsapp
                                    ? 'bg-green-100 text-green-700 border border-green-200' 
                                    : 'bg-orange-100 text-orange-700 border border-orange-200'
                                }`}>
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span className="text-xs font-semibold">
                                    {demanda.tem_resposta_whatsapp ? 'Respondido' : 'Sem resposta'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                <div>
                                  <p className="text-sm text-foreground">
                                    {demanda.logradouro || 'Endereço não informado'}
                                    {demanda.numero && `, ${demanda.numero}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {[demanda.bairro, demanda.cidade, demanda.uf].filter(Boolean).join(' • ')}
                                  </p>
                                  {demanda.referencia && (
                                    <p className="text-xs mt-1 text-muted-foreground">
                                      <span className="text-muted-foreground/80">Ref.:</span> {demanda.referencia}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Urgência */}
                            <div className="mt-2">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Nível de urgência:</span>
                                <span className={`text-sm font-medium ${getUrgenciaTextColor(demanda.nivel_de_urgencia)}`}>
                                  {demanda.nivel_de_urgencia || 'Não especificada'}
                                </span>
                              </div>
                            </div>

                            {/* Miniaturas adicionais */}
                            {demanda.fotos_do_problema && demanda.fotos_do_problema.length > 2 && (
                              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Mais fotos</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {demanda.fotos_do_problema.slice(2, 6).map((foto, index) => (
                                    <div 
                                      key={index} 
                                      className="h-24 bg-gray-100 dark:bg-gray-700/50 rounded overflow-hidden group"
                                    >
                                      <img 
                                        src={foto} 
                                        alt={`Imagem adicional ${index + 3}`}
                                        className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                                      />
                                    </div>
                                  ))}
                                  {demanda.fotos_do_problema.length > 6 && (
                                    <div className="h-24 bg-gray-100 dark:bg-gray-700/30 rounded border border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center">
                                      <span className="text-xs text-muted-foreground">
                                        +{demanda.fotos_do_problema.length - 6}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Rodapé do Card */}
                          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {demanda.requerente?.nome || 'Requerente não informado'}
                              </span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs text-primary hover:bg-primary/5"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/app/documentos/demandas-ruas/${demanda.uid}/detalhes`);
                              }}
                            >
                              Ver detalhes
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-center p-6">
                      <FileText className="w-10 h-10 text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">Nenhuma demanda encontrada</p>
                      <p className="text-sm text-muted-foreground/70 mt-1 text-center">
                        Ajuste os filtros ou verifique o cadastro.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 px-4 py-2 border-t mb-6">
                <div className="w-full flex flex-row justify-between items-center">
                  <div className="flex flex-row items-center gap-x-2 text-xs text-muted-foreground">
                    <span>Total: <span className="font-medium text-foreground">{demandas.length}</span></span>
                    <span className="text-gray-300">•</span>
                    <span>Exibindo: <span className="font-medium text-foreground">{filteredDemandas.length}</span></span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" disabled={true} className="h-7 px-2 text-xs">
                      Anterior
                    </Button>
                    <Button variant="ghost" size="sm" disabled={true} className="h-7 px-2 text-xs">
                      Próximo
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

      {/* Botão flutuante de configurações para mobile */}
      <div className="md:hidden fixed bottom-6 right-4 z-40">
        <button
          onClick={() => navigate('/app/documentos/demandas-ruas/configuracoes')}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Configurações da demanda"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* Modal de Visualização de Imagem em Tela Cheia */}
      <Dialog open={!!fullscreenImage} onOpenChange={(open) => !open && closeFullscreenImage()}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/90 border-none shadow-none">
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              onClick={closeFullscreenImage}
              className="absolute top-4 right-4 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              aria-label="Fechar visualização"
            >
              <XCircle className="w-8 h-8" />
            </button>
            <div className="w-full h-full flex items-center justify-center p-4">
              <img 
                src={fullscreenImage || ''} 
                alt="Visualização em tela cheia"
                className="max-w-full max-h-[85vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Arquivamento */}
      <Dialog open={showArchiveModal} onOpenChange={setShowArchiveModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              {demandaToArchive?.arquivado ? (
                <ArchiveRestore className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-500" />
              ) : (
                <Archive className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-500" />
              )}
            </div>
            
            <div className="space-y-2 w-full">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                {demandaToArchive?.arquivado ? 'Desarquivar Demanda' : 'Arquivar Demanda'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 px-2">
                {demandaToArchive?.arquivado 
                  ? 'Tem certeza que deseja desarquivar esta demanda? Ela voltará a aparecer na listagem principal.'
                  : 'Tem certeza que deseja arquivar esta demanda? Ela será ocultada da listagem principal.'}
              </p>
              {demandaToArchive && (
                <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-left">
                  <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                    {demandaToArchive.tipo_de_demanda?.replace('Infraestrutura::', '')}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 break-words">
                    {demandaToArchive.logradouro}
                    {demandaToArchive.numero && `, ${demandaToArchive.numero}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {demandaToArchive.bairro} • {demandaToArchive.cidade}
                  </p>
                </div>
              )}
              {!demandaToArchive?.arquivado && (
                <>
                  <div className="w-full mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-left px-1">
                      📁 Pasta de Arquivamento *
                    </label>
                    
                    {!mostrarNovaPasta ? (
                      <>
                        <Select 
                          value={pastasSelecionada} 
                          onValueChange={(value) => {
                            if (value === '__nova__') {
                              setMostrarNovaPasta(true);
                              setPastasSelecionada('');
                            } else {
                              setPastasSelecionada(value);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full h-10 sm:h-11 text-xs sm:text-sm">
                            <SelectValue placeholder="Selecione uma pasta..." />
                          </SelectTrigger>
                          <SelectContent>
                            {pastasArquivo.map(pasta => (
                              <SelectItem key={pasta} value={pasta || ''} className="text-xs sm:text-sm">
                                📁 {pasta}
                              </SelectItem>
                            ))}
                            <SelectItem value="__nova__" className="text-blue-600 font-medium text-xs sm:text-sm">
                              ➕ Criar Nova Pasta
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <>
                        <Input
                          type="text"
                          placeholder="Ex: Resolvidas 2025..."
                          value={nomePastaArquivo}
                          onChange={(e) => setNomePastaArquivo(e.target.value)}
                          className="w-full h-10 sm:h-11 text-xs sm:text-sm"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMostrarNovaPasta(false);
                            setNomePastaArquivo('');
                          }}
                          className="w-full text-gray-500 text-xs sm:text-sm h-9"
                        >
                          ← Voltar para lista de pastas
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-medium mt-2 px-2">
                    Você pode desarquivar a qualquer momento clicando no botão "Arquivadas".
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full pt-2 sm:pt-3">
              <Button
                variant="outline"
                className="flex-1 h-10 sm:h-11 text-xs sm:text-sm order-2 sm:order-1"
                onClick={() => setShowArchiveModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 h-10 sm:h-11 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 order-1 sm:order-2"
                onClick={handleConfirmArchive}
              >
                {demandaToArchive?.arquivado ? 'Desarquivar' : 'Arquivar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex flex-col items-center text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Excluir Demanda
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tem certeza que deseja excluir esta demanda?
              </p>
              {demandaToDelete && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {demandaToDelete.tipo_de_demanda?.replace('Infraestrutura::', '')}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {demandaToDelete.logradouro}
                    {demandaToDelete.numero && `, ${demandaToDelete.numero}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {demandaToDelete.bairro} • {demandaToDelete.cidade}
                  </p>
                </div>
              )}
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-3">
                A demanda será ocultada mas os dados serão preservados no sistema.
              </p>
            </div>

            <div className="flex gap-3 w-full pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCloseDeleteModal}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteDemanda}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default DemandasRuas;
