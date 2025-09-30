import { useState } from 'react';
import { Card } from "../../components/ui/card";
import { Tabs, TabsContent } from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { List } from 'lucide-react';
import { useAtendimentos } from "../../hooks/useAtendimentos";
import { useEffect, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Input
} from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useAtendimentosStore } from "../../store/useAtendimentosStore";
import { ChevronLeftIcon, ChevronRightIcon, X } from 'lucide-react';
import { useCategories } from "../../hooks/useCategories";
import { FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { useToast } from "../../components/ui/use-toast";
import { usePermissions } from "../../hooks/usePermissions";
import { useNavigate } from "react-router-dom";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Legend,
  ArcElement
);

export function AttendanceReport() {
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: (
          <div className="flex items-center gap-2">
            <X className="w-5 h-5 text-red-600" />
            <span className="text-gray-800 font-medium">Acesso Negado</span>
          </div>
        ),
        description: (
          <span className="text-gray-600">
            Você não tem permissão para acessar esta página.
          </span>
        ),
        duration: 3000,
        className: "bg-red-50 border border-red-200",
      });
      navigate("/app");
    }
  }, [isAdmin, navigate, toast]);

  if (!isAdmin) {
    return null;
  }

  const { data: atendimentosData, isLoading, error } = useAtendimentos();
  const { setAtendimentos } = useAtendimentosStore();
  const { data: categorias } = useCategories();
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("all");
  const [selectedUF, setSelectedUF] = useState<string>("all");
  const [selectedCategoria, setSelectedCategoria] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedBairro, setSelectedBairro] = useState(null);
  const [showBairroDetails, setShowBairroDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    if (atendimentosData) {
      console.log('Atendimentos carregados:', atendimentosData);
      setAtendimentos(atendimentosData);
    }
  }, [atendimentosData, setAtendimentos]);

  // Constantes para status
  const STATUS_ORDER = ['Concluído', 'Pendente', 'Em Andamento', 'Cancelado'];
  const STATUS_COLORS = {
    'Concluído': { bg: 'bg-green-100', text: 'text-green-800', bar: 'bg-green-400' },
    'Pendente': { bg: 'bg-yellow-100', text: 'text-yellow-800', bar: 'bg-yellow-400' },
    'Cancelado': { bg: 'bg-red-100', text: 'text-red-800', bar: 'bg-red-400' },
    'Em Andamento': { bg: 'bg-blue-100', text: 'text-blue-800', bar: 'bg-blue-400' }
  };

  // Função para normalizar status
  const normalizeStatus = (status: string | null): string => {
    if (!status) return '-';
    
    const statusMap = {
      'concluido': 'Concluído',
      'concluído': 'Concluído',
      'pendente': 'Pendente',
      'em_andamento': 'Em Andamento',
      'cancelado': 'Cancelado'
    };

    const normalized = status.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace('_', ' ');

    return statusMap[normalized] || status;
  };

  // Filtragem dos atendimentos
  const filteredAtendimentos = useMemo(() => {
    if (!atendimentosData) return [];
    
    return atendimentosData.filter((atendimento) => {
      const matchesUF = selectedUF === "all" || atendimento.uf === selectedUF;
      const matchesCity = selectedCity === "all" || atendimento.cidade === selectedCity;
      const matchesNeighborhood = selectedNeighborhood === "all" || atendimento.bairro === selectedNeighborhood;
      const matchesCategoria = selectedCategoria === "all" || atendimento.categoria_uid === selectedCategoria;
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        (atendimento.descricao?.toLowerCase().includes(searchLower) ||
         atendimento.responsavel?.toLowerCase().includes(searchLower) ||
         atendimento.gbp_eleitores?.nome?.toLowerCase().includes(searchLower) ||
         `${atendimento.logradouro || ''} ${atendimento.numero || ''} ${atendimento.bairro || ''} ${atendimento.cidade || ''} ${atendimento.uf || ''}`.toLowerCase().includes(searchLower));

      return matchesUF && matchesCity && matchesNeighborhood && matchesCategoria && matchesSearch;
    });
  }, [atendimentosData, selectedUF, selectedCity, selectedNeighborhood, selectedCategoria, searchTerm]);

  // Contadores de status
  const statusCounts = useMemo(() => {
    const counts = {
      total: filteredAtendimentos.length,
      pendentes: 0,
      emAndamento: 0,
      concluidos: 0,
      cancelados: 0
    };

    filteredAtendimentos.forEach((atendimento) => {
      const status = normalizeStatus(atendimento.status);
      
      switch(status) {
        case 'Pendente':
          counts.pendentes++;
          break;
        case 'Em Andamento':
          counts.emAndamento++;
          break;
        case 'Concluído':
          counts.concluidos++;
          break;
        case 'Cancelado':
          counts.cancelados++;
          break;
      }
    });

    return counts;
  }, [filteredAtendimentos]);

  // Listas filtradas baseadas na seleção atual
  const ufs = useMemo(() => {
    const uniqueUfs = [...new Set(atendimentosData?.map(a => a.uf?.toUpperCase()).filter(Boolean) ?? [])];
    return uniqueUfs.sort();
  }, [atendimentosData]);

  const cities = useMemo(() => {
    const filteredCities = atendimentosData
      ?.filter(a => selectedUF === "all" || a.uf?.toUpperCase() === selectedUF)
      .map(a => a.cidade)
      .filter(Boolean) ?? [];
    return [...new Set(filteredCities)].sort();
  }, [atendimentosData, selectedUF]);

  const neighborhoods = useMemo(() => {
    const filteredNeighborhoods = atendimentosData
      ?.filter(a => {
        const matchesUF = selectedUF === "all" || a.uf?.toUpperCase() === selectedUF;
        const matchesCity = selectedCity === "all" || a.cidade === selectedCity;
        return matchesUF && matchesCity;
      })
      .map(a => a.bairro)
      .filter(Boolean) ?? [];
    return [...new Set(filteredNeighborhoods)].sort();
  }, [atendimentosData, selectedUF, selectedCity]);

  // Resetar filtros dependentes
  useEffect(() => {
    setSelectedCity("all");
    setSelectedNeighborhood("all");
  }, [selectedUF]);

  useEffect(() => {
    setSelectedNeighborhood("all");
  }, [selectedCity]);

  // Funções para processar dados dos gráficos
  const processLocationData = () => {
    const cityData = {};
    const neighborhoodData = {};

    // Primeiro, vamos agrupar os bairros por cidade
    filteredAtendimentos.forEach(atendimento => {
      const cidade = atendimento.cidade || 'Não informada';
      const bairro = atendimento.bairro || 'Não informado';
      const status = normalizeStatus(atendimento.status);

      // Inicializa dados da cidade se não existir
      if (!cityData[cidade]) {
        cityData[cidade] = {
          total: 0,
          pendentes: 0,
          emAndamento: 0,
          concluidos: 0,
          cancelados: 0,
          bairros: {}
        };
      }

      // Inicializa dados do bairro se não existir
      if (!cityData[cidade].bairros[bairro]) {
        cityData[cidade].bairros[bairro] = {
          total: 0,
          pendentes: 0,
          emAndamento: 0,
          concluidos: 0,
          cancelados: 0
        };
      }

      // Incrementa totais
      cityData[cidade].total++;
      cityData[cidade].bairros[bairro].total++;

      // Atualiza contadores por status
      switch(status) {
        case 'Pendente':
          cityData[cidade].pendentes++;
          cityData[cidade].bairros[bairro].pendentes++;
          break;
        case 'Em Andamento':
          cityData[cidade].emAndamento++;
          cityData[cidade].bairros[bairro].emAndamento++;
          break;
        case 'Concluído':
          cityData[cidade].concluidos++;
          cityData[cidade].bairros[bairro].concluidos++;
          break;
        case 'Cancelado':
          cityData[cidade].cancelados++;
          cityData[cidade].bairros[bairro].cancelados++;
          break;
      }

      // Adiciona ao neighborhoodData para facilitar a ordenação
      if (!neighborhoodData[bairro]) {
        neighborhoodData[bairro] = {
          cidade,
          total: 1,
          pendentes: status === 'Pendente' ? 1 : 0,
          emAndamento: status === 'Em Andamento' ? 1 : 0,
          concluidos: status === 'Concluído' ? 1 : 0,
          cancelados: status === 'Cancelado' ? 1 : 0
        };
      } else {
        neighborhoodData[bairro].total++;
        if (status === 'Pendente') neighborhoodData[bairro].pendentes++;
        if (status === 'Em Andamento') neighborhoodData[bairro].emAndamento++;
        if (status === 'Concluído') neighborhoodData[bairro].concluidos++;
        if (status === 'Cancelado') neighborhoodData[bairro].cancelados++;
      }
    });

    return { cityData, neighborhoodData };
  };

  // Processa os dados para o gráfico de barras
  const processBarData = () => {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const data = new Array(12).fill(0);

    filteredAtendimentos.forEach(atendimento => {
      if (atendimento.data_atendimento) {
        const month = new Date(atendimento.data_atendimento).getMonth();
        data[month]++;
      }
    });

    return {
      labels: months,
      datasets: [
        {
          label: 'Atendimentos',
          data: data,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
        },
      ],
    };
  };

  // Processa os dados para o gráfico de pizza
  const processPieData = () => {
    return {
      labels: ['Pendente', 'Em Andamento', 'Concluído', 'Cancelado'],
      datasets: [
        {
          data: [
            statusCounts.pendentes,
            statusCounts.emAndamento,
            statusCounts.concluidos,
            statusCounts.cancelados,
          ],
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(255, 206, 86, 0.5)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(255, 206, 86, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  // Função para filtrar atendimentos por bairro
  const getAtendimentosByBairro = (bairro) => {
    if (!bairro) return [];
    return atendimentosData
      .filter(atendimento => atendimento.bairro === bairro)
      .filter(atendimento => !selectedStatus || normalizeStatus(atendimento.status) === selectedStatus);
  };

  // Função para exportar para Excel
  const handleExportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'GBP Político';
      
      // 1. Resumo por Cidade
      const worksheetCidades = workbook.addWorksheet('Resumo por Cidade');
      worksheetCidades.columns = [
        { header: 'Cidade', key: 'cidade', width: 30 },
        { header: 'Total', key: 'total', width: 15 },
        { header: 'Concluídos', key: 'concluidos', width: 15 },
        { header: 'Pendentes', key: 'pendentes', width: 15 },
        { header: 'Em Andamento', key: 'emAndamento', width: 15 },
        { header: 'Cancelados', key: 'cancelados', width: 15 }
      ];

      // Estilo do cabeçalho
      worksheetCidades.getRow(1).font = { bold: true };
      worksheetCidades.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E2E2' }
      };

      const locationData = processLocationData();
      Object.entries(locationData.cityData).forEach(([cidade, stats]) => {
        worksheetCidades.addRow({
          cidade,
          total: stats.total,
          concluidos: stats.concluidos,
          pendentes: stats.pendentes,
          emAndamento: stats.emAndamento,
          cancelados: stats.cancelados
        });
      });

      // 2. Resumo por Bairro
      const worksheetBairros = workbook.addWorksheet('Resumo por Bairro');
      worksheetBairros.columns = [
        { header: 'Cidade', key: 'cidade', width: 30 },
        { header: 'Bairro', key: 'bairro', width: 30 },
        { header: 'Total', key: 'total', width: 15 },
        { header: 'Concluídos', key: 'concluidos', width: 15 },
        { header: 'Pendentes', key: 'pendentes', width: 15 },
        { header: 'Em Andamento', key: 'emAndamento', width: 15 },
        { header: 'Cancelados', key: 'cancelados', width: 15 }
      ];

      // Estilo do cabeçalho
      worksheetBairros.getRow(1).font = { bold: true };
      worksheetBairros.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E2E2' }
      };

      Object.entries(locationData.neighborhoodData).forEach(([cidade, bairros]) => {
        Object.entries(bairros).forEach(([bairro, stats]) => {
          worksheetBairros.addRow({
            cidade,
            bairro,
            total: stats.total,
            concluidos: stats.concluidos,
            pendentes: stats.pendentes,
            emAndamento: stats.emAndamento,
            cancelados: stats.cancelados
          });
        });
      });

      // 3. Lista Detalhada
      const worksheetDetalhes = workbook.addWorksheet('Lista Detalhada');
      worksheetDetalhes.columns = [
        { header: 'Data Atendimento', key: 'data_atendimento', width: 20 },
        { header: 'Cidade', key: 'cidade', width: 20 },
        { header: 'Bairro', key: 'bairro', width: 20 },
        { header: 'Logradouro', key: 'logradouro', width: 30 },
        { header: 'UF', key: 'uf', width: 10 },
        { header: 'CEP', key: 'cep', width: 15 },
        { header: 'Categoria', key: 'categoria', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Responsável', key: 'responsavel', width: 20 },
        { header: 'Indicado', key: 'indicado', width: 20 },
        { header: 'Número', key: 'numero', width: 15 },
        { header: 'Descrição', key: 'descricao', width: 50 },
      ];

      // Estilo do cabeçalho
      worksheetDetalhes.getRow(1).font = { bold: true };
      worksheetDetalhes.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E2E2' }
      };

      // Adicionar dados detalhados
      atendimentosData.forEach(atendimento => {
        worksheetDetalhes.addRow({
          data_atendimento: atendimento.data_atendimento ? new Date(atendimento.data_atendimento).toLocaleString() : '',
          cidade: atendimento.cidade || '',
          bairro: atendimento.bairro || '',
          logradouro: atendimento.logradouro || '',
          uf: atendimento.uf || '',
          cep: atendimento.cep || '',
          categoria: atendimento.gbp_categorias?.nome || '',
          status: atendimento.status || '',
          responsavel: atendimento.responsavel || '',
          indicado: atendimento.indicado || '',
          numero: atendimento.numero || '',
          descricao: atendimento.descricao || ''
        });
      });

      // Gerar arquivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Relatorio_Atendimentos_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-gray-800 font-medium">Sucesso!</span>
          </div>
        ),
        description: (
          <span className="text-gray-600">
            Relatório exportado com sucesso.
          </span>
        ),
        duration: 3000,
        className: "bg-green-50 border border-green-200",
      });
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar o relatório. Tente novamente.",
        duration: 3000,
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="w-full pb-4">
          <div className="bg-white md:rounded-lg shadow-sm md:border border-t-0 border-b-0 md:border-t md:border-b border-gray-100 p-2 md:p-4">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="w-full pb-4">
          <div className="bg-white md:rounded-lg shadow-sm md:border border-t-0 border-b-0 md:border-t md:border-b border-gray-100 p-2 md:p-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p>Erro ao carregar atendimentos: {error.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const locationData = processLocationData();

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="w-full pb-4">
        <div className="bg-white md:rounded-lg shadow-sm md:border md:border-gray-100">
          <div className="px-0 md:px-4 py-4">
            <div className="flex items-center justify-between mb-4 px-2 md:px-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
                        <ChevronLeftIcon className="h-5 w-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-800">Relatório de Atendimentos</h1>
                </div>
                <Button
                    onClick={handleExportToExcel}
                    className="hidden md:inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Exportar Excel
                </Button>
            </div>

            {/* Filtros */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-4 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg font-semibold text-gray-900">Filtros por Localização</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-600">
                      Estado (UF)
                    </label>
                    <Select value={selectedUF} onValueChange={setSelectedUF}>
                      <SelectTrigger className="bg-white border-gray-200 hover:border-blue-400 transition-colors">
                        <SelectValue placeholder="Todos os estados" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="all" className="bg-white hover:bg-gray-50">Todos os estados</SelectItem>
                        {ufs.map(uf => (
                          <SelectItem 
                            key={uf} 
                            value={uf}
                            className="bg-white hover:bg-gray-50"
                          >
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-600">
                      Cidade
                    </label>
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger className="bg-white border-gray-200 hover:border-blue-400 transition-colors">
                        <SelectValue placeholder="Todas as cidades" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="all" className="bg-white hover:bg-gray-50">Todas as cidades</SelectItem>
                        {cities.map(city => (
                          <SelectItem 
                            key={city} 
                            value={city}
                            className="bg-white hover:bg-gray-50"
                          >
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-600">
                      Bairro
                    </label>
                    <Select value={selectedNeighborhood} onValueChange={setSelectedNeighborhood}>
                      <SelectTrigger className="bg-white border-gray-200 hover:border-blue-400 transition-colors">
                        <SelectValue placeholder="Todos os bairros" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="all" className="bg-white hover:bg-gray-50">Todos os bairros</SelectItem>
                        {neighborhoods.map(neighborhood => (
                          <SelectItem 
                            key={neighborhood} 
                            value={neighborhood}
                            className="bg-white hover:bg-gray-50"
                          >
                            {neighborhood}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-600">
                      Categoria
                    </label>
                    <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                      <SelectTrigger className="bg-white border-gray-200 hover:border-blue-400 transition-colors">
                        <SelectValue placeholder="Todas as categorias" />
                      </SelectTrigger>
                      <SelectContent 
                        className="bg-white"
                        style={{ maxHeight: '220px', overflowY: 'auto' }}
                      >
                        <SelectItem value="all" className="bg-white hover:bg-gray-50">Todas as categorias</SelectItem>
                        {categorias?.map(categoria => (
                          <SelectItem 
                            key={categoria.uid} 
                            value={categoria.uid}
                            className="bg-white hover:bg-gray-50"
                          >
                            {categoria.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-600">
                      Busca
                    </label>
                    <Input
                      type="text"
                      placeholder="Descrição, responsável ou endereço"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-white border-gray-200 hover:border-blue-400 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cards de Status */}
            <div className="px-2 md:px-0 pt-6">
              <div className="grid md:grid-cols-5 gap-2 md:gap-4">
                <Card className="p-3 md:p-4 hover:shadow-md transition-shadow bg-white col-span-2 md:col-span-1">
                  <h3 className="text-sm font-medium text-gray-500">Total</h3>
                  <p className="text-2xl font-bold text-gray-900">{statusCounts.total}</p>
                </Card>
                <Card className="p-3 md:p-4 hover:shadow-md transition-shadow bg-white">
                  <h3 className="text-sm font-medium text-yellow-500">Pendentes</h3>
                  <p className="text-2xl font-bold text-yellow-600">{statusCounts.pendentes}</p>
                </Card>
                <Card className="p-3 md:p-4 hover:shadow-md transition-shadow bg-white">
                  <h3 className="text-sm font-medium text-blue-500">Em Andamento</h3>
                  <p className="text-2xl font-bold text-blue-600">{statusCounts.emAndamento}</p>
                </Card>
                <Card className="p-3 md:p-4 hover:shadow-md transition-shadow bg-white">
                  <h3 className="text-sm font-medium text-green-500">Concluídos</h3>
                  <p className="text-2xl font-bold text-green-600">{statusCounts.concluidos}</p>
                </Card>
                <Card className="p-3 md:p-4 hover:shadow-md transition-shadow bg-white">
                  <h3 className="text-sm font-medium text-red-500">Cancelados</h3>
                  <p className="text-2xl font-bold text-red-600">{statusCounts.cancelados}</p>
                </Card>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="visao-geral" className="w-full">
              <TabsContent value="visao-geral" className="mt-0">
                <div className="grid grid-cols-1 gap-6">
                  {/* Top 5 Cidades com seus respectivos bairros */}
                  <div className="grid grid-cols-1 gap-6 mt-6">
                    {Object.entries(locationData.cityData).map(([cityName, cityStats]) => (
                      <Card key={cityName} className="overflow-hidden bg-white">
                        <div className="border-b border-gray-100 p-4 md:p-6">
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
                            <div className="flex items-center gap-2 mb-2 md:mb-0">
                              <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
                              <h3 className="text-lg font-semibold text-gray-800">
                                {cityName}
                              </h3>
                            </div>
                            <div className="text-sm text-gray-500">
                              Total: {cityStats.total} atendimentos
                            </div>
                          </div>

                          {/* Barra de progresso */}
                          <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="flex h-full">
                              {cityStats.concluidos > 0 && (
                                <div
                                  className="h-full bg-green-500"
                                  style={{
                                    width: `${(cityStats.concluidos / 200) * 100}%`,
                                  }}
                                />
                              )}
                              {cityStats.pendentes > 0 && (
                                <div
                                  className="h-full bg-yellow-500"
                                  style={{
                                    width: `${(cityStats.pendentes / 200) * 100}%`,
                                  }}
                                />
                              )}
                              {cityStats.emAndamento > 0 && (
                                <div
                                  className="h-full bg-blue-500"
                                  style={{
                                    width: `${(cityStats.emAndamento / 200) * 100}%`,
                                  }}
                                />
                              )}
                              {cityStats.cancelados > 0 && (
                                <div
                                  className="h-full bg-red-500"
                                  style={{
                                    width: `${(cityStats.cancelados / 200) * 100}%`,
                                  }}
                                />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-500 mt-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              <span>C: {cityStats.concluidos}</span>
                              <span className="w-2 h-2 rounded-full bg-yellow-500" />
                              <span>P: {cityStats.pendentes}</span>
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              <span>EA: {cityStats.emAndamento}</span>
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                              <span>Ca: {cityStats.cancelados}</span>
                            </div>
                            <span>Total: {cityStats.total}</span>
                          </div>
                        </div>

                        {/* Lista de bairros da cidade */}
                        <div className="p-4 md:p-6">
                          <h4 className="text-sm font-medium text-gray-600 mb-4">Principais Bairros</h4>
                          <div className="space-y-3">
                            {Object.entries(cityStats.bairros).map(([bairroName, bairroStats]) => (
                              <div key={bairroName} className="bg-gray-50 p-3 md:p-4 rounded-lg">
                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                                  <span className="font-medium flex-1">{bairroName}</span>
                                  <div className="flex items-center justify-between md:justify-end gap-2 md:gap-4">
                                    <span className="text-sm text-gray-500">Total: {bairroStats.total}</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedBairro(bairroName);
                                        setShowBairroDetails(true);
                                      }}
                                      className="whitespace-nowrap"
                                    >
                                      <List className="w-4 h-4 mr-1" />
                                      Ver Lista
                                    </Button>
                                  </div>
                                </div>
                                {/* Barra de progresso */}
                                <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="flex h-full">
                                    {bairroStats.concluidos > 0 && (
                                      <div
                                        className="h-full bg-green-500"
                                        style={{
                                          width: `${(bairroStats.concluidos / 200) * 100}%`,
                                        }}
                                      />
                                    )}
                                    {bairroStats.pendentes > 0 && (
                                      <div
                                        className="h-full bg-yellow-500"
                                        style={{
                                          width: `${(bairroStats.pendentes / 200) * 100}%`,
                                        }}
                                      />
                                    )}
                                    {bairroStats.emAndamento > 0 && (
                                      <div
                                        className="h-full bg-blue-500"
                                        style={{
                                          width: `${(bairroStats.emAndamento / 200) * 100}%`,
                                        }}
                                      />
                                    )}
                                    {bairroStats.cancelados > 0 && (
                                      <div
                                        className="h-full bg-red-500"
                                        style={{
                                          width: `${(bairroStats.cancelados / 200) * 100}%`,
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                  <div className="flex flex-wrap gap-2">
                                    {bairroStats.concluidos > 0 && (
                                      <span className="bg-green-50 px-2 py-0.5 rounded-full">
                                        C: {bairroStats.concluidos}
                                      </span>
                                    )}
                                    {bairroStats.pendentes > 0 && (
                                      <span className="bg-yellow-50 px-2 py-0.5 rounded-full">
                                        P: {bairroStats.pendentes}
                                      </span>
                                    )}
                                    {bairroStats.emAndamento > 0 && (
                                      <span className="bg-blue-50 px-2 py-0.5 rounded-full">
                                        EA: {bairroStats.emAndamento}
                                      </span>
                                    )}
                                    {bairroStats.cancelados > 0 && (
                                      <span className="bg-red-50 px-2 py-0.5 rounded-full">
                                        Ca: {bairroStats.cancelados}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="lista-detalhada" className="mt-6">
                <Card className="mt-6 overflow-hidden bg-white">
                  <div className="border-b border-gray-100 p-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-800">Lista de Atendimentos</h3>
                      <div className="text-sm text-gray-500">
                        Total: {filteredAtendimentos.length} atendimentos
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[100px] sm:w-auto">
                              Data
                            </th>
                            <th scope="col" className="hidden sm:table-cell px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                              Tipo
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                              Responsável
                            </th>
                            <th scope="col" className="hidden sm:table-cell px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                              Categoria
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[100px] sm:w-auto">
                              Status
                            </th>
                            <th scope="col" className="hidden sm:table-cell px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                              Descrição
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredAtendimentos.map((atendimento) => (
                            <tr key={atendimento.uid} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm text-gray-900 font-medium whitespace-nowrap">
                                {atendimento.data_atendimento 
                                  ? new Date(atendimento.data_atendimento).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: '2-digit'
                                    })
                                  : '-'
                                }
                              </td>
                              <td className="hidden sm:table-cell px-3 py-2 text-sm text-gray-900">
                                {atendimento.tipo_de_atendimento || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {atendimento.responsavel || '-'}
                              </td>
                              <td className="hidden sm:table-cell px-3 py-2 text-sm text-gray-900">
                                {atendimento.gbp_categorias?.nome || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm whitespace-nowrap">
                                <span className={`
                                  inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                                  ${STATUS_COLORS[normalizeStatus(atendimento.status)]?.bg || 'bg-gray-100'} 
                                  ${STATUS_COLORS[normalizeStatus(atendimento.status)]?.text || 'text-gray-800'}
                                `}>
                                  {normalizeStatus(atendimento.status)}
                                </span>
                              </td>
                              <td 
                                className="px-3 py-2 text-sm text-gray-900 max-w-[300px] cursor-help"
                                title={atendimento.descricao || '-'}
                              >
                                {atendimento.descricao || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Modal de Detalhes do Bairro */}
            <Dialog open={showBairroDetails} onOpenChange={setShowBairroDetails} className="p-4">
              <DialogContent className="flex flex-col w-[90%] mx-auto sm:w-full sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[1100px] max-h-[85vh] bg-white rounded-lg shadow-lg border px-6 py-4 gap-4">
                <DialogHeader className="pb-4">
                  <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                    <span>Atendimentos em {selectedBairro}</span>
                  </DialogTitle>
                  <DialogDescription className="flex flex-col gap-4">
                    <span>{getAtendimentosByBairro(selectedBairro).length} atendimentos encontrados neste bairro</span>
                    <div className="flex flex-col gap-2">
                      <span className="text-sm text-gray-600">Filtrar por status:</span>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(STATUS_COLORS).map(([status, colors]) => (
                          <button
                            key={status}
                            onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
                            className={`
                              inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer
                              transition-all duration-200 ease-in-out
                              ${selectedStatus === status 
                                ? `ring-2 ring-offset-2 ring-primary shadow-md scale-110 ${colors.bg} ${colors.text}`
                                : `${colors.bg} ${colors.text} opacity-70 hover:opacity-100 hover:scale-105`
                              }
                            `}
                          >
                            {status}
                            {selectedStatus === status && (
                              <span className="ml-1 text-xs">✓</span>
                            )}
                          </button>
                        ))}
                        {selectedStatus && (
                          <button
                            onClick={() => setSelectedStatus(null)}
                            className="text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2.5 py-1 rounded-full"
                          >
                            Limpar filtro
                          </button>
                        )}
                      </div>
                    </div>
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto px-1">
                  <div className="bg-gray-50 rounded-lg border">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px] divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                              Data
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                              Tipo
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                              Responsável
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                              Categoria
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                              Status
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                              Descrição
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedBairro && 
                            getAtendimentosByBairro(selectedBairro)
                              .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                              .map((atendimento) => (
                            <tr key={atendimento.uid} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm text-gray-900 font-medium whitespace-nowrap">
                                {atendimento.data_atendimento 
                                  ? new Date(atendimento.data_atendimento).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: '2-digit'
                                    })
                                  : '-'
                                }
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                                {atendimento.tipo_de_atendimento || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                                {atendimento.responsavel || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                                {atendimento.gbp_categorias?.nome || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedStatus(normalizeStatus(atendimento.status))}
                                  className={`
                                    inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer
                                    ${STATUS_COLORS[normalizeStatus(atendimento.status)]?.bg || 'bg-gray-100'} 
                                    ${STATUS_COLORS[normalizeStatus(atendimento.status)]?.text || 'text-gray-800'}
                                    hover:ring-2 hover:ring-offset-2 hover:ring-primary transition-all
                                  `}
                                >
                                  {normalizeStatus(atendimento.status)}
                                </button>
                              </td>
                              <td 
                                className="px-3 py-2 text-sm text-gray-900 max-w-[300px] cursor-help"
                                title={atendimento.descricao || '-'}
                              >
                                {atendimento.descricao || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginação e Botão Fechar */}
                    <div className="border-t">
                      {selectedBairro && getAtendimentosByBairro(selectedBairro).length > ITEMS_PER_PAGE && (
                        <div className="px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
                          <div className="text-sm text-gray-600 order-2 sm:order-1">
                            <span>
                              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} até{' '}
                              {Math.min(currentPage * ITEMS_PER_PAGE, getAtendimentosByBairro(selectedBairro).length)}{' '}
                              de {getAtendimentosByBairro(selectedBairro).length}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 order-1 sm:order-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronLeftIcon className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-1">
                              {Array.from(
                                { length: Math.ceil(getAtendimentosByBairro(selectedBairro).length / ITEMS_PER_PAGE) },
                                (_, i) => i + 1
                              ).map((page) => (
                                <Button
                                  key={page}
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(page)}
                                  className="h-8 w-8 p-0"
                                >
                                  {page}
                                </Button>
                              ))}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => 
                                Math.min(Math.ceil(getAtendimentosByBairro(selectedBairro).length / ITEMS_PER_PAGE), prev + 1)
                              )}
                              disabled={currentPage === Math.ceil(getAtendimentosByBairro(selectedBairro).length / ITEMS_PER_PAGE)}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronRightIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="px-4 py-2 flex justify-center border-t">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowBairroDetails(false)}
                          className="hover:bg-gray-100 transition-colors"
                        >
                          Fechar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

    </div>
  );
}
