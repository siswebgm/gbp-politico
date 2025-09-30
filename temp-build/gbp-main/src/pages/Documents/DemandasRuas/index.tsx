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
  RefreshCw, 
  CalendarDays, 
  MapPin, 
  User, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { demandasRuasService, type DemandaRua } from '@/services/demandasRuasService';
import { useCompanyStore } from '@/store/useCompanyStore';
import { useAuth } from '@/providers/AuthProvider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';

export function DemandasRuas() {
  const navigate = useNavigate();
  const { company } = useCompanyStore();
  const [demandas, setDemandas] = useState<DemandaRua[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [urgenciaFilter, setUrgenciaFilter] = useState<string>('todos');
  const [dateFilter, setDateFilter] = useState<string>('todos');
  const [tipoDemandaFilter, setTipoDemandaFilter] = useState<string>('todos');
  const [cidadeFilter, setCidadeFilter] = useState<string>('todos');
  const [bairroFilter, setBairroFilter] = useState<string>('todos');
  const [showFavoritos, setShowFavoritos] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

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
    if (dateFilter === 'todos') return true;
    
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (dateFilter) {
      case 'hoje':
        const startOfToday = new Date(today);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        return date >= startOfToday && date <= endOfToday;
        
      case 'semana':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo da semana atual
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // Sábado da semana atual
        endOfWeek.setHours(23, 59, 59, 999);
        return date >= startOfWeek && date <= endOfWeek;
        
      case 'mes':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        return date >= startOfMonth && date <= endOfMonth;
        
      case 'ano':
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const endOfYear = new Date(today.getFullYear(), 11, 31);
        endOfYear.setHours(23, 59, 59, 999);
        return date >= startOfYear && date <= endOfYear;
        
      default:
        return true;
    }
  };

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
    const matchesFavoritos = !showFavoritos || (showFavoritos && demanda.favorito);
    const matchesTipoDemanda = tipoDemandaFilter === 'todos' || demanda.tipo_de_demanda === tipoDemandaFilter;
    const matchesCidade = cidadeFilter === 'todos' || demanda.cidade === cidadeFilter;
    const matchesBairro = bairroFilter === 'todos' || demanda.bairro === bairroFilter;

    return matchesSearch && matchesStatus && matchesUrgencia && matchesDate && matchesFavoritos && matchesTipoDemanda && matchesCidade && matchesBairro;
  });

  // Formatar data
  const handleToggleFavorito = async (e: React.MouseEvent, demanda: DemandaRua) => {
    e.stopPropagation();
    try {
      const novoStatus = !demanda.favorito;
      await demandasRuasService.toggleFavorito(demanda.uid, novoStatus);
      setDemandas(demandas.map(d => 
        d.uid === demanda.uid ? { ...d, favorito: novoStatus } : d
      ));
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
    }
  };
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
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
      
      <div className="flex-1 py-2 md:py-6 px-2 md:px-4">
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
              <span className="text-sm text-muted-foreground/70">
                • {filteredDemandas.length} de {demandas.length} itens
                {filteredDemandas.length < demandas.length && (
                  <span className="text-muted-foreground/70">
                    {' '}({demandas.length - filteredDemandas.length} oculto{filteredDemandas.length < demandas.length - 1 ? 's' : ''})
                  </span>
                )}
              </span>
            </div>
          </div>
          </div>

          {/* Main Content */}
          <div className="space-y-2">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="space-y-3">
                  {/* Barra de busca e ações */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <div className="relative flex-1 min-w-[120px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar demandas..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm"
                        />
                      </div>
                      
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Button 
                          variant={showFavoritos ? "default" : "outline"} 
                          size="icon" 
                          onClick={() => setShowFavoritos(!showFavoritos)}
                          className={`h-9 w-9 sm:w-auto px-2 sm:px-3 transition-colors ${
                            showFavoritos ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-600 border-yellow-200' : ''
                          }`}
                          title={showFavoritos ? 'Mostrar todas' : 'Mostrar favoritos'}
                        >
                          <Star className={`h-4 w-4 ${showFavoritos ? 'fill-yellow-400' : ''}`} />
                          <span className="sr-only sm:not-sr-only sm:ml-1 text-xs">{showFavoritos ? 'Todas' : 'Favoritos'}</span>
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={loadDemandas}
                          className="h-9 w-9 sm:w-auto px-2 sm:px-3"
                          title="Atualizar lista"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span className="sr-only sm:not-sr-only sm:ml-1 text-xs">Atualizar</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Filtros */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
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
                    <div className="flex-1 min-w-[120px]">
                      <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-full text-xs sm:text-sm h-9">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-3.5 w-3.5 text-gray-500" />
                            <span className="truncate">
                              {dateFilter === 'todos' ? 'Período' : 
                               dateFilter === 'hoje' ? 'Hoje' :
                               dateFilter === 'semana' ? 'Esta semana' :
                               dateFilter === 'mes' ? 'Este mês' : 'Este ano'}
                            </span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos" className="text-xs sm:text-sm">Todos os períodos</SelectItem>
                          <SelectItem value="hoje" className="text-xs sm:text-sm">Hoje</SelectItem>
                          <SelectItem value="semana" className="text-xs sm:text-sm">Esta semana</SelectItem>
                          <SelectItem value="mes" className="text-xs sm:text-sm">Este mês</SelectItem>
                          <SelectItem value="ano" className="text-xs sm:text-sm">Este ano</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Botão Limpar Filtros */}
                    {(statusFilter !== 'todos' || urgenciaFilter !== 'todos' || dateFilter !== 'todos' || searchTerm || tipoDemandaFilter !== 'todos' || cidadeFilter !== 'todos' || bairroFilter !== 'todos') && (
                      <div className="ml-auto">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setStatusFilter('todos');
                            setUrgenciaFilter('todos');
                            setDateFilter('todos');
                            setSearchTerm('');
                            setTipoDemandaFilter('todos');
                            setCidadeFilter('todos');
                            setBairroFilter('todos');
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
                            {/* Botão de Favorito */}
                            <button 
                              onClick={(e) => handleToggleFavorito(e, demanda)}
                              className="absolute top-2 right-2 z-10 p-1.5 bg-white/80 dark:bg-gray-800/80 rounded-full shadow-sm hover:bg-white dark:hover:bg-gray-700 transition-colors"
                              title={demanda.favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                            >
                              <Star 
                                className={`w-4 h-4 ${demanda.favorito ? 'fill-yellow-400 text-yellow-500' : 'text-gray-400'}`} 
                              />
                            </button>
                            
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
              <CardFooter className="bg-gray-50 px-6 py-4 border-t">
                <div className="w-full flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                  <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span>Total:</span>
                      <span className="font-medium text-foreground">{demandas.length}</span>
                    </div>
                    <span className="hidden sm:inline">•</span>
                    <div className="flex items-center gap-1">
                      <span>Exibindo:</span>
                      <span className="font-medium text-foreground">{filteredDemandas.length}</span>
                      <span>demanda{filteredDemandas.length !== 1 ? 's' : ''}</span>
                    </div>
                    {filteredDemandas.length < demandas.length && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <div className="flex items-center gap-1">
                          <span>Filtrado</span>
                          <span className="text-amber-600 dark:text-amber-400">
                            ({demandas.length - filteredDemandas.length} oculto{filteredDemandas.length < demandas.length - 1 ? 's' : ''})
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" disabled={true}>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={true}>
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
      <div className="md:hidden fixed bottom-6 right-6 z-50">
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

    </div>
  );
}

export default DemandasRuas;
