import { useEffect, useRef } from 'react';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';
import { useDashboardStore } from '../store/useDashboardStore';
import { useAuth } from '../providers/AuthProvider';
import { demandasRuasService } from '../services/demandasRuasService';
import { format, subDays, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StatsData {
  total: number;
  crescimento: number;
  distribuicaoPorDia: Record<string, number>;
  distribuicaoPorHorario: Record<string, number>;
  mediaDiaria: number;
  melhorDia: {
    dia: string;
    valor: number;
  };
}

interface DashboardData {
  totalAtendimentos: number;
  totalEleitores: number;
  totalOficios: number;
  totalRequerimentos: number;
  totalProjetosLei: number;
  totalAgendamentos: number;
  totalDemandas: number;
  evolucaoEleitores: Record<string, number>;
  evolucaoAtendimentos: Record<string, number>;
  atendimentosPorStatus: Record<string, number>;
  distribuicaoBairro: Array<{ bairro: string; eleitores: number; atendimentos: number }>;
  eleitoresStats: StatsData;
  atendimentosStats: StatsData;
  oficiosStats: StatsData;
  requerimentosStats: StatsData;
  projetosLeiStats: StatsData;
  agendamentosStats: StatsData;
  demandasStats: StatsData;
}

interface CacheData {
  data: DashboardData;
  timestamp: Date;
}

const CACHE_DURATION = 5; // Duração do cache em minutos

function processarEstatisticas(dados: any[], sevenDaysAgo: Date, period: number = 7): StatsData {
  const periodDate = subDays(new Date(), period);
  const dadosRecentes = dados?.filter(
    d => new Date(d.created_at) >= periodDate
  ) || [];

  const distribuicaoPorDia: Record<string, number> = {};
  const distribuicaoPorHorario: Record<string, number> = {
    'Manhã (6h-12h)': 0,
    'Tarde (12h-18h)': 0,
    'Noite (18h-6h)': 0
  };

  let melhorDia = { dia: '', valor: 0 };

  dadosRecentes.forEach(item => {
    const data = new Date(item.created_at);
    const dia = format(data, 'EEEE', { locale: ptBR });
    const hora = data.getHours();

    // Distribuição por dia
    distribuicaoPorDia[dia] = (distribuicaoPorDia[dia] || 0) + 1;

    // Distribuição por horário
    if (hora >= 6 && hora < 12) {
      distribuicaoPorHorario['Manhã (6h-12h)']++;
    } else if (hora >= 12 && hora < 18) {
      distribuicaoPorHorario['Tarde (12h-18h)']++;
    } else {
      distribuicaoPorHorario['Noite (18h-6h)']++;
    }

    // Atualizar melhor dia
    if (distribuicaoPorDia[dia] > melhorDia.valor) {
      melhorDia = { dia, valor: distribuicaoPorDia[dia] };
    }
  });

  const mediaDiaria = dadosRecentes.length / period;
  const crescimento = dados?.length ? 
    ((dadosRecentes.length / dados.length) * 100) : 0;

  return {
    total: dadosRecentes.length,
    crescimento,
    distribuicaoPorDia,
    distribuicaoPorHorario,
    mediaDiaria,
    melhorDia
  };
}

export function useDashboardData() {
  const company = useCompanyStore((state) => state.company);
  const { user } = useAuth();
  const {
    data,
    lastUpdate,
    isLoading,
    error,
    setData,
    setLoading,
    setError,
    clearData
  } = useDashboardStore();
  const isMountedRef = useRef(true);
  const lastCompanyUidRef = useRef<string | null>(null);

  const shouldRefreshCache = () => {
    if (!lastUpdate) return true;
    
    const minutesSinceLastUpdate = differenceInMinutes(
      new Date(),
      lastUpdate
    );
    
    return minutesSinceLastUpdate >= CACHE_DURATION;
  };

  const fetchData = async (forceRefresh = false) => {
    if (!company?.uid) return;

    // Se temos cache válido e não é forceRefresh, use o cache
    if (!forceRefresh && !shouldRefreshCache()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Buscando dados para empresa:', company.uid);

      const sevenDaysAgo = subDays(new Date(), 7);

      // Buscar dados de todas as tabelas
      const [
        { data: eleitores, error: eleitoresError },
        { data: atendimentos, error: atendimentosError },
        { data: oficios, error: oficiosError },
        { data: requerimentos, error: requerimentosError },
        { data: projetosLei, error: projetosLeiError },
        { data: agendamentos, error: agendamentosError },
        demandas
      ] = await Promise.all([
        supabaseClient
          .from('gbp_eleitores')
          .select('uid, created_at')
          .eq('empresa_uid', company.uid),
        supabaseClient
          .from('gbp_atendimentos')
          .select('uid, created_at, status')
          .eq('empresa_uid', company.uid)
          .order('created_at', { ascending: false }),
        supabaseClient
          .from('gbp_oficios')
          .select('uid, created_at')
          .eq('empresa_uid', company.uid),
        supabaseClient
          .from('gbp_requerimentos')
          .select('uid, created_at')
          .eq('empresa_uid', company.uid)
          .is('deleted_at', null),
        supabaseClient
          .from('gbp_projetos_lei')
          .select('uid, created_at')
          .eq('empresa_uid', company.uid)
          .is('deleted_at', null),
        supabaseClient
          .from('gbp_agendamentos')
          .select('uid, created_at')
          .eq('empresa_uid', company.uid),
        // Buscar demandas do usuário
        demandasRuasService.getDemandas(company.uid).catch(() => [])
      ]);

      // Verificar erros
      if (eleitoresError) throw eleitoresError;
      if (atendimentosError) throw atendimentosError;
      if (oficiosError) throw oficiosError;
      if (requerimentosError) throw requerimentosError;
      if (projetosLeiError) throw projetosLeiError;
      if (agendamentosError) throw agendamentosError;

      // Filtrar demandas do usuário logado com as novas regras
      const demandasDoUsuario = (demandas || []).filter(demanda => {
        console.log('Filtrando demanda:', {
          uid: demanda.uid,
          status: demanda.status,
          arquivado: demanda.arquivado,
          excluido: demanda.excluido,
          atribuido_para_uid: demanda.atribuido_para_uid,
          userUid: user?.uid,
          userNivel: user?.nivel_acesso
        });
        
        // Não contar demandas excluídas
        if (demanda.excluido === true) {
          console.log('Demanda excluída, ignorando');
          return false;
        }
        
        // Se não for admin, mostrar apenas demandas atribuídas ao usuário
        if (user?.nivel_acesso?.toLowerCase() !== 'admin') {
          if (!demanda.atribuido_para_uid?.includes(user?.uid || '')) {
            console.log('Demanda não atribuída ao usuário, ignorando');
            return false;
          }
        }
        
        // Para todos os usuários (incluindo admin), filtrar por status e arquivado
        // Não exibir card se status for 'concluido' (protocolado deve ser exibido)
        if (demanda.status === 'concluido') {
          console.log('Demanda com status concluído, ignorando');
          return false;
        }
        
        // Não exibir card se estiver arquivado
        if (demanda.arquivado === true) {
          console.log('Demanda arquivada, ignorando');
          return false;
        }
        
        console.log('Demanda incluída no filtro');
        // Admins podem ver todas as outras demandas
        return true;
      });
      
      console.log('Total de demandas antes do filtro:', demandas?.length || 0);
      console.log('Total de demandas após filtro:', demandasDoUsuario.length);
      console.log('Demandas filtradas:', demandasDoUsuario.map(d => ({ uid: d.uid, status: d.status, arquivado: d.arquivado })));

      const dashboardData = {
        totalAtendimentos: atendimentos?.length || 0,
        totalEleitores: eleitores?.length || 0,
        totalOficios: oficios?.length || 0,
        totalRequerimentos: requerimentos?.length || 0,
        totalProjetosLei: projetosLei?.length || 0,
        totalAgendamentos: agendamentos?.length || 0,
        totalDemandas: demandasDoUsuario.length,
        evolucaoEleitores: {},
        evolucaoAtendimentos: {},
        atendimentosPorStatus: {},
        distribuicaoBairro: [],
        eleitoresStats: processarEstatisticas(eleitores || [], sevenDaysAgo),
        atendimentosStats: processarEstatisticas(atendimentos || [], sevenDaysAgo),
        oficiosStats: processarEstatisticas(oficios || [], sevenDaysAgo),
        requerimentosStats: processarEstatisticas(requerimentos || [], sevenDaysAgo),
        projetosLeiStats: processarEstatisticas(projetosLei || [], sevenDaysAgo),
        agendamentosStats: processarEstatisticas(agendamentos || [], sevenDaysAgo),
        demandasStats: processarEstatisticas(demandasDoUsuario || [], sevenDaysAgo)
      };

      if (isMountedRef.current) {
        setData(dashboardData);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
      if (isMountedRef.current) {
        setError(err as Error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    if (company?.uid && lastCompanyUidRef.current && lastCompanyUidRef.current !== company.uid) {
      clearData();
      fetchData(true);
    } else {
      fetchData();
    }

    lastCompanyUidRef.current = company?.uid || null;

    return () => {
      isMountedRef.current = false;
    };
  }, [company?.uid]);

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchData(true)
  };
}
