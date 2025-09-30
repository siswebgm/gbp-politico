import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { demandasRuasService } from '@/services/demandasRuasService';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Button } from '@/components/ui/button';
import * as Tabs from '@/components/ui/tabs';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';

// Definindo a interface para os dados do gráfico
interface DadosGrafico {
  totalDemandas: number;
  comDocumento: number;
  concluidas: {
    total: number;
    detalhes: Array<{
      uid: string;
      criado_em: string;
      demanda_concluida_data: string | null;
    }>;
  };
  porStatus: Record<string, number>;
  evolucaoMensal: Array<{
    mes: string;
    total: number;
  }>;
  [key: string]: unknown; // Índice de assinatura para propriedades adicionais
}
import { 
  ChevronLeft, 
  Loader2, 
  RefreshCw, 
  FileText, 
  FileCheck, 
  CheckCircle, 
  Clock,
  BarChart2,
  TrendingUp
} from 'lucide-react';

// Componente de gráfico de barras
const BarChart = ({ 
  data, 
  title 
}: { 
  data: Record<string, number> | Array<{mes: string, total: number}>; 
  title: string 
}) => {
  // Normalizar os dados para garantir que estamos trabalhando com o formato correto
  const normalizedData = Array.isArray(data) 
    ? data.reduce((acc, item) => {
        acc[item.mes] = item.total;
        return acc;
      }, {} as Record<string, number>)
    : data || {};
  if (!normalizedData || Object.keys(normalizedData).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <BarChart2 className="w-12 h-12 text-gray-300 mb-2" />
        <p className="text-gray-500 text-sm">Sem dados disponíveis para o período selecionado</p>
      </div>
    );
  }

  const maxValue = Math.max(...Object.values(normalizedData));
  const entries = Object.entries(normalizedData);
  const total = Object.values(normalizedData).reduce((a, b) => a + b, 0);

  // Ordenar por valor (maior para menor)
  entries.sort((a, b) => b[1] - a[1]);

  // Cores para as barras
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-yellow-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-red-500',
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="space-y-4 flex-1 overflow-y-auto pr-2">
        {entries.map(([label, value], index) => {
          const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
          const color = colors[index % colors.length];
          
          return (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700 capitalize truncate max-w-[150px]">
                  {label.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900">{value}</span>
                  <span className="text-gray-500 w-10 text-right">{percentage}%</span>
                </div>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${color} rounded-full transition-all duration-700 ease-out`} 
                  style={{ 
                    width: maxValue > 0 ? `${(value / maxValue) * 100}%` : '0%',
                    transitionDelay: `${index * 100}ms`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {title && (
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Total</span>
            <span className="font-semibold">{total.toLocaleString('pt-BR')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function RelatoriosDemandas() {
  const navigate = useNavigate();
  const { company } = useCompanyStore();
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relatorio, setRelatorio] = useState<DadosGrafico | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 1)),
    to: endOfMonth(new Date()),
  });

  // Formatar o período para exibição
  const periodoFormatado = dateRange?.from && dateRange?.to
    ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
    : 'Período não definido';

  // Função para calcular porcentagem
  const calcularPorcentagem = (valor: number, total: number) => {
    return total > 0 ? Math.round((valor / total) * 100) : 0;
  };

  // Carregar dados do relatório
  const carregarRelatorio = async () => {
    if (!company?.uid) {
      setError('ID da empresa não encontrado');
      setLoading(false);
      return;
    }

    // Só seta loading se for o primeiro carregamento
    if (!relatorio) {
      setLoading(true);
    }
    setError(null);

    try {
      const dataInicio = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
      const dataFim = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

      const dados = await demandasRuasService.getRelatorioDemandas(
        company.uid,
        { inicio: dataInicio, fim: dataFim }
      );

      setRelatorio(dados as DadosGrafico);
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
      setError('Erro ao carregar os dados do relatório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados iniciais e quando as datas forem alteradas
  useEffect(() => {
    const timer = setTimeout(() => {
      // Se for a primeira carga, usa o loading normal
      // Se for uma atualização, usa o updating
      if (relatorio) {
        setIsUpdating(true);
      }
      carregarRelatorio().finally(() => setIsUpdating(false));
    }, 300); // Debounce de 300ms
    
    return () => clearTimeout(timer);
  }, [JSON.stringify(dateRange), company?.uid]); // Usar JSON.stringify para comparar objetos

  // Exibir estado de carregamento
  if (loading && !relatorio) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-600 animate-spin" />
          <p className="text-gray-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  // Exibir mensagem de erro
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-sm">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar relatório</h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button 
            onClick={carregarRelatorio}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <div className="w-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden relative">
          {/* Overlay de carregamento sutil */}
          {isUpdating && (
            <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
              <div className="bg-blue-100 p-3 rounded-full shadow-lg">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            </div>
          )}
          {/* Cabeçalho */}
          <div className="border-b border-gray-200 px-6 py-5">
            <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate(-1)}
                  className="text-gray-600 hover:bg-gray-100 p-2"
                  title="Voltar"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Relatórios de Demandas</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Dados consolidados das demandas por período
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <DateRangePicker
                    date={dateRange}
                    onDateChange={setDateRange as (date: DateRange | undefined) => void}
                    className="w-full sm:w-auto"
                  />
                <Button 
                  onClick={carregarRelatorio}
                  disabled={loading}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Atualizar
                </Button>
              </div>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="px-6 py-5 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
              {/* Card Total de Demandas */}
              <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-blue-700">Total de Demandas</p>
                  <div className="p-2 rounded-lg bg-white shadow-sm border border-blue-50">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="mt-2 mb-3">
                  <p className="text-3xl font-bold text-gray-900">
                    {relatorio?.totalDemandas?.toLocaleString('pt-BR') || '0'}
                  </p>
                </div>
                <div className="mt-auto">
                  <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-full w-fit">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                    <span className="text-xs">Período: {periodoFormatado}</span>
                  </div>
                </div>
              </div>

              {/* Card Com Documento */}
              <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-green-700">Com Documento</p>
                  <div className="p-2 rounded-lg bg-white shadow-sm border border-green-50">
                    <FileCheck className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="mt-2 mb-3">
                  <p className="text-3xl font-bold text-gray-900">
                    {relatorio?.comDocumento?.toLocaleString('pt-BR') || '0'}
                  </p>
                </div>
                <div className="mt-auto">
                  <div className="flex items-center text-xs text-green-600 bg-green-50 px-2.5 py-1.5 rounded-full w-fit">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                    <span className="text-xs">{calcularPorcentagem(relatorio?.comDocumento || 0, relatorio?.totalDemandas || 1)}% do total</span>
                  </div>
                </div>
              </div>

              {/* Card Concluídas */}
              <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-purple-700">Concluídas</p>
                  <div className="p-2 rounded-lg bg-white shadow-sm border border-purple-50">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
                <div className="mt-2 mb-3">
                  <p className="text-3xl font-bold text-gray-900">
                    {relatorio?.concluidas?.total?.toLocaleString('pt-BR') || '0'}
                  </p>
                </div>
                <div className="mt-auto">
                  <div className="flex items-center text-xs text-purple-600 bg-purple-50 px-2.5 py-1.5 rounded-full w-fit">
                    <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                    <span className="text-xs">{calcularPorcentagem(relatorio?.concluidas?.total || 0, relatorio?.totalDemandas || 1)}% do total</span>
                  </div>
                </div>
              </div>

              {/* Card Em Andamento */}
              <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-amber-700">Em Andamento</p>
                  <div className="p-2 rounded-lg bg-white shadow-sm border border-amber-50">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <div className="mt-2 mb-3">
                  <p className="text-3xl font-bold text-gray-900">
                    {relatorio?.totalDemandas ? (relatorio.totalDemandas - (relatorio.concluidas?.total || 0)).toLocaleString('pt-BR') : '0'}
                  </p>
                </div>
                <div className="mt-auto">
                  <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-full w-fit">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                    <span className="text-xs">
                      {relatorio?.totalDemandas ? calcularPorcentagem(relatorio.totalDemandas - (relatorio.concluidas?.total || 0), relatorio.totalDemandas) : '0'}% do total
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Título da seção de visualização */}
          <div className="px-6 py-5 border-t border-gray-200 w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Visualização dos Dados</h3>
          </div>

          {/* Tabs de visualização */}
          <div className="px-6 pb-6">
            <Tabs.Tabs defaultValue="status" className="w-full">
              <div className="border-b border-gray-200">
                <Tabs.TabsList className="inline-flex space-x-1 rounded-md bg-gray-100 p-1">
                  <Tabs.TabsTrigger 
                    value="status" 
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600"
                  >
                    <BarChart2 className="w-4 h-4 mr-2" />
                    Por Status
                  </Tabs.TabsTrigger>
                  <Tabs.TabsTrigger 
                    value="evolucao" 
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Evolução Mensal
                  </Tabs.TabsTrigger>
                </Tabs.TabsList>
              </div>

              <div className="mt-6">
                <Tabs.TabsContent value="status" className="mt-0">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Distribuição por Status</h3>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Total: {relatorio?.totalDemandas?.toLocaleString('pt-BR') || '0'}
                        </span>
                      </div>
                    </div>
                    <div className="h-64">
                      <BarChart 
                        data={relatorio?.porStatus || {}}
                        title="Distribuição por Status"
                      />
                    </div>
                  </div>
                </Tabs.TabsContent>

                <Tabs.TabsContent value="evolucao" className="mt-0">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Evolução Mensal</h3>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Período: {periodoFormatado}
                        </span>
                      </div>
                    </div>
                    <div className="h-64">
                      <BarChart
                        data={relatorio?.evolucaoMensal || []}
                        title="Evolução Mensal"
                      />
                    </div>
                  </div>
                </Tabs.TabsContent>
              </div>
            </Tabs.Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

