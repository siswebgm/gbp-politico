import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  MessageSquare, 
  UserCheck, 
  CalendarCheck, 
  Book, 
  FileSpreadsheet, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  RefreshCw, 
  ChevronRight, 
  Gift, 
  Phone,
  CheckCircle,
  XCircle,
  MapPin,
  Info
} from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
import { useLastAccess } from '../../hooks/useLastAccess';
import { supabaseClient } from '../../lib/supabase';
import { cn } from '../../lib/utils';

import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { StatCard } from './components/StatCard';
import { MonthlyEvolution } from './components/MonthlyEvolution';
import { TypeDistribution } from './components/TypeDistribution';
import { TrialBanner } from '../../components/TrialBanner';
import { BirthdaySection } from './components/BirthdaySection';
import { NewAttendancesNotification } from '../../components/NewAttendancesNotification';
import { ResumoDiario } from './components/ResumoDiario';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const formatMes = (mesAno: string) => {
  const [ano, mes] = mesAno.split('-');
  return `${mes}/${ano}`;
};

const formatDate = (dateString: string) => {
  if (!dateString || dateString === 'N/A') return 'Data não disponível';
  
  try {
    const date = new Date(dateString);
    // Verifica se a data é válida
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
};

const monthlyData = {
  labels: ['Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov'],
  datasets: [
    {
      label: 'Atendimentos',
      data: [0, 0, 0, 0, 0, 0],
      borderColor: 'rgb(53, 162, 235)',
      backgroundColor: 'rgba(53, 162, 235, 0.5)',
    },
    {
      label: 'Pessoas',
      data: [0, 0, 0, 0, 0, 0],
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
    },
  ],
};

const distributionData = {
  labels: ['Pessoas'],
  datasets: [
    {
      data: [0],
      backgroundColor: ['rgb(75, 192, 192)'],
      borderColor: ['rgb(75, 192, 192)'],
      borderWidth: 1,
    },
  ],
};

export function Dashboard() {
  const navigate = useNavigate();
  const company = useCompanyStore((state) => state.company);
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData();
  const clearDashboardData = useDashboardStore((state) => state.clearData);
  const [aniversariantes, setAniversariantes] = useState<any[]>([]);
  const [loadingAniversariantes, setLoadingAniversariantes] = useState(true);
  const [periodoSelecionado, setPeriodoSelecionado] = useState('dia'); // 'dia', 'ultimos7dias', 'mes', 'ano', 'ano_YYYY'

  const estaNoPeridoSelecionado = useCallback((dataEnvio: Date) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataEnvioNormalizada = new Date(dataEnvio);
    dataEnvioNormalizada.setHours(0, 0, 0, 0);

    switch (periodoSelecionado) {
      case 'dia':
        return dataEnvioNormalizada.getTime() === hoje.getTime();

      case 'ultimos7dias': {
        const inicio7Dias = new Date(hoje);
        inicio7Dias.setDate(hoje.getDate() - 6); // 7 dias incluindo hoje
        inicio7Dias.setHours(0, 0, 0, 0);

        return dataEnvioNormalizada >= inicio7Dias && dataEnvioNormalizada <= hoje;
      }

      case 'mes':
        return dataEnvioNormalizada.getMonth() === hoje.getMonth() &&
               dataEnvioNormalizada.getFullYear() === hoje.getFullYear();

      case 'ano':
        return dataEnvioNormalizada.getFullYear() === hoje.getFullYear();

      default:
        // Handle ano_YYYY format
        if (periodoSelecionado.startsWith('ano_')) {
          const selectedYear = parseInt(periodoSelecionado.replace('ano_', ''));
          return dataEnvioNormalizada.getFullYear() === selectedYear;
        }
        return false;
    }
  }, [periodoSelecionado]);

  // Função para carregar aniversariantes
  const loadAniversariantes = useCallback(async () => {
    if (!company?.uid) {
      console.log('Company UID não disponível');
      return;
    }

    try {
      setLoadingAniversariantes(true);
      
      // Determine the year to filter based on periodoSelecionado
      let filterYear = new Date().getFullYear();
      if (periodoSelecionado.startsWith('ano_')) {
        filterYear = parseInt(periodoSelecionado.replace('ano_', ''));
      }
      
      const startOfYear = `${filterYear}-01-01`;
      const startOfNextYear = `${filterYear + 1}-01-01`;

      const { data, error } = await supabaseClient
        .from('gbp_relatorio_niver')
        .select(`
          uid,
          created_at,
          eleitor_nome,
          eleitor_whatsapp,
          eleitor_bairro,
          eleitor_cidade,
          eleitor_uf,
          categoria,
          mensagem_tipo,
          mensagem_entregue,
          mensagem_comentario,
          mensagem_perdida,
          indicado,
          responsavel,
          nascimento,
          data_envio,
          eleitor_uid
        `)
        .eq('empresa_uid', company.uid)
        .not('data_envio', 'is', null)
        .gte('date_part', startOfYear)
        .lt('date_part', startOfNextYear);

      if (error) {
        console.error('Erro ao buscar aniversariantes:', error);
        throw error;
      }

      // Filtrar aniversariantes do período selecionado
      const aniversariantesFiltrados = data?.filter(registro => {
        if (!registro.data_envio) return false;

        try {
          const dataEnvio = new Date(registro.data_envio + 'T12:00:00Z');
          return estaNoPeridoSelecionado(dataEnvio);
        } catch (err) {
          console.error('Erro ao processar data_envio:', registro.data_envio, err);
          return false;
        }
      }) || [];

      // Ordenar por data_envio
      const aniversariantesOrdenados = aniversariantesFiltrados.sort((a, b) => {
        const dateA = new Date(a.data_envio + 'T12:00:00Z');
        const dateB = new Date(b.data_envio + 'T12:00:00Z');
        return dateA.getTime() - dateB.getTime();
      });

      console.log('Aniversariantes encontrados:', {
        periodo: periodoSelecionado,
        quantidade: aniversariantesOrdenados.length,
        registros: aniversariantesOrdenados.map(a => ({
          nome: a.eleitor_nome,
          data_envio: a.data_envio,
          nascimento: a.nascimento,
          bairro: a.eleitor_bairro,
          cidade: a.eleitor_cidade
        }))
      });

      setAniversariantes(aniversariantesOrdenados);
    } catch (error) {
      console.error('Erro ao carregar aniversariantes:', error);
    } finally {
      setLoadingAniversariantes(false);
    }
  }, [company?.uid, estaNoPeridoSelecionado]);

  // Efeito para recarregar quando mudar o período
  useEffect(() => {
    loadAniversariantes();
  }, [loadAniversariantes, periodoSelecionado]);

  // Função para carregar os dados
  const loadDashboardData = useCallback(async () => {
    if (!company?.uid) {
      console.log('Company UID não disponível');
      return;
    }

    try {
      setLoadingAniversariantes(true);
      
      // Verificar autenticação
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Erro de autenticação:', sessionError);
        return;
      }

      console.log('Tentando carregar dados do dashboard para empresa:', {
        empresa_uid: company.uid,
        user_id: session.user.id,
        role: session.user.role
      });

      // Tentar buscar a empresa primeiro para confirmar acesso
      const { data: empresaData, error: empresaError } = await supabaseClient
        .from('gbp_empresas')
        .select('uid, nome')
        .eq('uid', company.uid)
        .single();

      if (empresaError) {
        console.error('Erro ao verificar empresa:', empresaError);
        return;
      }

      console.log('Empresa verificada:', empresaData);

      // Agora buscar os dados do dashboard
      const { data, error } = await supabaseClient
        .from('gbp_dashboard')
        .select(`
          totalAtendimentos,
          totalEleitores,
          totalOficios,
          totalRequerimentos,
          totalProjetosLei,
          totalAgendamentos,
          atendimentosStats,
          eleitoresStats,
          oficiosStats,
          requerimentosStats,
          projetosLeiStats,
          agendamentosStats
        `)
        .eq('empresa_uid', company.uid);

      if (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        throw error;
      }

      console.log('Dados brutos:', {
        total: data?.length || 0,
        campos: data?.[0] ? Object.keys(data[0]) : [],
        amostra: data?.slice(0, 2)
      });

      // Filtrar dados do dashboard
      const dashboardDataFiltrado = data?.[0] || {};

      console.log('Dados do dashboard:', {
        data: dashboardDataFiltrado,
      });

      // Atualizar o estado com os dados do dashboard
      // setDashboardData(dashboardDataFiltrado);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoadingAniversariantes(false);
    }
  }, [company?.uid]);

  // Efeito para carregar os dados
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Subscription para atualizações em tempo real
  useRealtimeSubscription({
    table: 'gbp_relatorio_niver',
    onUpdate: () => {
      console.log('Atualização em tempo real recebida');
      loadAniversariantes();
    }
  });

  // Limpa os dados do dashboard quando o componente é desmontado
  useEffect(() => {
    return () => {
      // Não limpar os dados ao desmontar para manter o cache
      // clearDashboardData();
    };
  }, []);

  // Configurar subscriptions para atualizações em tempo real
  const handleRealtimeUpdate = useCallback(() => {
    // Ao invés de recarregar imediatamente, aguarda um tempo para evitar múltiplas atualizações
    const timeoutId = setTimeout(() => {
      refetch();
    }, 2000); // Aguarda 2 segundos após a última atualização

    return () => clearTimeout(timeoutId);
  }, [refetch]);

  useRealtimeSubscription({
    table: 'gbp_eleitores',
    onUpdate: handleRealtimeUpdate
  });

  useRealtimeSubscription({
    table: 'gbp_atendimentos',
    onUpdate: handleRealtimeUpdate
  });

  useRealtimeSubscription({
    table: 'gbp_oficios',
    onUpdate: handleRealtimeUpdate
  });

  useRealtimeSubscription({
    table: 'gbp_requerimentos',
    onUpdate: handleRealtimeUpdate
  });

  useRealtimeSubscription({
    table: 'gbp_projetos_lei',
    onUpdate: handleRealtimeUpdate
  });

  // Atualiza o último acesso do usuário
  useLastAccess();

  if (isLoading) {
    return (
      <div className="flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 pt-0.5 pb-4 md:pb-6 md:pt-1 px-2 md:px-4">
          <div className="flex flex-col space-y-2 md:space-y-4 mx-auto">
            {/* Header Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Cards Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ))}
            </div>

            {/* Charts Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
                <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
                <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Growth Rate Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
              </div>
              <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
              <div className="w-48 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-500 mb-4">Erro ao carregar dados do dashboard</p>
        <button
          onClick={() => refetch()}
          className={cn(
            "flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
          )}
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">Nenhuma empresa selecionada</p>
          <p className="text-sm">Por favor, selecione uma empresa para continuar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 pt-3 pb-4 md:pb-6 md:pt-3 px-2 md:px-4">
        <div className="flex flex-col space-y-2 md:space-y-4 mx-auto">
          <TrialBanner />
          
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                Dashboard
              </h1>
              <button
                onClick={() => refetch()}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm",
                  "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500"
                )}
              >
                <RefreshCw className="w-4 h-4 text-primary animate-[pulse_2s_ease-in-out_infinite]" />
                <span className="font-medium">Atualizar</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            {/* Banner de Demandas - Apenas se houver demandas */}
            {Number(dashboardData?.totalDemandas || 0) > 0 && (
              <div 
                onClick={() => navigate('/app/documentos/demandas-ruas')}
                className="bg-gradient-to-r from-blue-400 to-cyan-400 dark:from-blue-500 dark:to-cyan-500 rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
              >
                {/* Efeito de brilho animado */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                
                {/* Conteúdo do banner - Layout responsivo */}
                <div className="relative z-10">
                  {/* Layout para mobile: empilhado */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="bg-white/20 dark:bg-white/10 p-3 sm:p-4 rounded-full backdrop-blur-sm flex-shrink-0">
                        <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg sm:text-3xl md:text-2xl font-bold text-white mb-1 leading-tight">
                          Você tem {Number(dashboardData?.totalDemandas || 0)} demanda(s)
                        </h2>
                        <p className="text-blue-100 dark:text-blue-200 text-xs sm:text-sm leading-relaxed">
                          Clique para gerenciar suas demandas
                        </p>
                      </div>
                    </div>
                    
                    {/* Botão de acesso - alinhado à direita em desktop, abaixo em mobile */}
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                      <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-pulse" />
                      <span className="text-white font-medium text-sm sm:text-base whitespace-nowrap">
                        Acessar agora
                      </span>
                    </div>
                  </div>
                </div>

                {/* Indicadores visuais */}
                <div className="absolute top-2 right-2 flex space-x-1">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-ping"></div>
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                title="Total de Atendimentos"
                value={Number(dashboardData?.totalAtendimentos || 0)}
                total={Number(dashboardData?.totalAtendimentos || 0)}
                icon={MessageSquare}
                color="text-blue-700"
                stats={dashboardData.atendimentosStats}
                showDetailsLink
                detailsUrl="/app/atendimentos/relatorios"
              />
              <StatCard
                title="Total de Pessoas"
                value={Number(dashboardData?.totalEleitores || 0)}
                total={Number(dashboardData?.totalEleitores || 0)}
                icon={Users}
                color="text-green-700"
                stats={dashboardData.eleitoresStats}
                footer={
                  <Link
                    to="/app/pessoas/relatorio"
                    className={cn(
                      "text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300",
                      "flex items-center gap-1"
                    )}
                  >
                    Ver detalhes
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                }
              />
              <StatCard
                title="Total de Ofícios"
                value={Number(dashboardData?.totalOficios || 0)}
                total={Number(dashboardData?.totalOficios || 0)}
                icon={FileText}
                color="text-yellow-700"
                stats={dashboardData.oficiosStats}
              />
              <StatCard
                title="Total de Requerimentos"
                value={Number(dashboardData?.totalRequerimentos || 0)}
                total={Number(dashboardData?.totalRequerimentos || 0)}
                icon={FileSpreadsheet}
                color="text-orange-700"
                stats={dashboardData.requerimentosStats}
              />
              <StatCard
                title="Total de Projetos"
                value={Number(dashboardData?.totalProjetosLei || 0)}
                total={Number(dashboardData?.totalProjetosLei || 0)}
                icon={BookOpen}
                color="text-purple-700"
                stats={dashboardData.projetosLeiStats}
              />
              <StatCard
                title="Total de Agendamentos"
                value={Number(dashboardData?.totalAgendamentos || 0)}
                total={Number(dashboardData?.totalAgendamentos || 0)}
                icon={Calendar}
                color="text-indigo-700"
                stats={dashboardData.agendamentosStats}
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <MonthlyEvolution 
                  data={{
                    labels: monthlyData.labels,
                    datasets: [
                      {
                        label: 'Atendimentos',
                        data: monthlyData.datasets[0].data,
                        borderColor: 'rgb(53, 162, 235)',
                        backgroundColor: 'rgba(53, 162, 235, 0.5)',
                      },
                      {
                        label: 'Pessoas',
                        data: Array(6).fill(dashboardData?.totalEleitores || 0),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                      }
                    ]
                  }}
                />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <TypeDistribution 
                  data={{
                    labels: distributionData.labels,
                    datasets: [{
                      data: [dashboardData?.totalEleitores || 0],
                      backgroundColor: distributionData.datasets[0].backgroundColor,
                      borderColor: distributionData.datasets[0].borderColor,
                      borderWidth: distributionData.datasets[0].borderWidth,
                    }]
                  }}
                  total={Number(dashboardData?.totalEleitores || 0)}
                />
              </div>
            </div>

            {/* Growth Rate Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border-l-4 border-l-orange-400">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Taxa de Crescimento</h4>
              </div>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {dashboardData.eleitoresStats.crescimento.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Crescimento em relação ao mês anterior
              </p>
            </div>

            {/* Resumo de Atividades */}
            <ResumoDiario />

            {/* Seção de Aniversariantes */}
            <div className="mt-2">
              <BirthdaySection
                aniversariantes={aniversariantes}
                isLoading={loadingAniversariantes}
                periodoSelecionado={periodoSelecionado}
                onPeriodoChange={setPeriodoSelecionado}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Espaçamento extra no final para mobile */}
      <div className="h-8 sm:h-0"></div>
      
      {/* Componente de Notificações de Novos Atendimentos */}
      <NewAttendancesNotification />
    </div>
  );
}
