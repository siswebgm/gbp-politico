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
      label: 'Eleitores',
      data: [0, 0, 0, 0, 0, 0],
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
    },
  ],
};

const distributionData = {
  labels: ['Eleitores'],
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
  const [periodoSelecionado, setPeriodoSelecionado] = useState('dia'); // 'dia', 'semana', 'mes'

  const estaNoPeridoSelecionado = useCallback((dataNascimento: Date) => {
    // Criar data no fuso horário de Brasília (UTC-3)
    const hoje = new Date();
    const brasiliaOffset = -3 * 60; // offset em minutos para Brasília
    
    // Ajustar para horário de Brasília
    const hojeBrasilia = new Date(hoje.getTime() + (hoje.getTimezoneOffset() + brasiliaOffset) * 60000);
    
    // Converter data de nascimento para horário de Brasília mantendo dia/mês
    const nascimentoBrasilia = new Date(
      hojeBrasilia.getFullYear(), // Usar ano atual
      dataNascimento.getMonth(),
      dataNascimento.getDate()
    );

    // Comparar apenas mês e dia no horário de Brasília
    const mesHoje = hojeBrasilia.getMonth();
    const diaHoje = hojeBrasilia.getDate();
    const mesNascimento = nascimentoBrasilia.getMonth();
    const diaNascimento = nascimentoBrasilia.getDate();

    switch (periodoSelecionado) {
      case 'dia':
        return mesNascimento === mesHoje && diaNascimento === diaHoje;
      
      case 'semana': {
        // Calcular início e fim da semana em Brasília
        const inicioSemana = new Date(hojeBrasilia);
        inicioSemana.setDate(hojeBrasilia.getDate() - hojeBrasilia.getDay()); // Domingo
        const fimSemana = new Date(hojeBrasilia);
        fimSemana.setDate(hojeBrasilia.getDate() + (6 - hojeBrasilia.getDay())); // Sábado

        return nascimentoBrasilia >= inicioSemana && nascimentoBrasilia <= fimSemana;
      }
      
      case 'mes':
        return mesNascimento === mesHoje;
      
      default:
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
          eleitor_uid
        `)
        .eq('empresa_uid', company.uid)
        .not('nascimento', 'is', null);

      if (error) {
        console.error('Erro ao buscar aniversariantes:', error);
        throw error;
      }

      // Filtrar aniversariantes do período selecionado
      const aniversariantesFiltrados = data?.filter(registro => {
        if (!registro.nascimento) return false;
        
        try {
          // Criar data UTC para comparação
          const dataNascimento = new Date(registro.nascimento + 'T12:00:00Z');
          return estaNoPeridoSelecionado(dataNascimento);
        } catch (err) {
          console.error('Erro ao processar data:', registro.nascimento, err);
          return false;
        }
      }) || [];

      // Ordenar por dia e mês de nascimento usando UTC
      const aniversariantesOrdenados = aniversariantesFiltrados.sort((a, b) => {
        const dateA = new Date(a.nascimento + 'T12:00:00Z');
        const dateB = new Date(b.nascimento + 'T12:00:00Z');
        
        const mesA = dateA.getUTCMonth();
        const diaA = dateA.getUTCDate();
        const mesB = dateB.getUTCMonth();
        const diaB = dateB.getUTCDate();
        
        if (mesA === mesB) {
          return diaA - diaB;
        }
        return mesA - mesB;
      });

      console.log('Aniversariantes encontrados:', {
        periodo: periodoSelecionado,
        quantidade: aniversariantesOrdenados.length,
        registros: aniversariantesOrdenados.map(a => ({
          nome: a.eleitor_nome,
          data: a.nascimento,
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
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 pt-0.5 pb-4 md:pb-6 md:pt-1 px-2 md:px-4">
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
                  "bg-white hover:bg-gray-50 text-gray-900 rounded-lg border border-gray-200 transition-colors",
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
                title="Total de Eleitores"
                value={Number(dashboardData?.totalEleitores || 0)}
                total={Number(dashboardData?.totalEleitores || 0)}
                icon={Users}
                color="text-green-700"
                stats={dashboardData.eleitoresStats}
                footer={
                  <Link
                    to="/app/eleitores/relatorio"
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
                        label: 'Eleitores',
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-3 mb-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Taxa de Crescimento</h4>
                <div className="bg-orange-100 dark:bg-orange-900/30 p-1.5 rounded-full">
                  <TrendingUp className="w-4 h-4 text-orange-700 dark:text-orange-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {dashboardData.eleitoresStats.crescimento.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Crescimento em relação ao mês anterior
              </p>
            </div>

            {/* Seção de Aniversariantes */}
            <div className="mt-8">
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
      
      {/* Componente de Notificações de Novos Atendimentos */}
      <NewAttendancesNotification />
    </div>
  );
}