import { useEffect, useRef } from 'react';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';
import { useDashboardStore } from '../store/useDashboardStore';
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
  const {
    data,
    lastUpdate,
    isLoading,
    error,
    setData,
    setLoading,
    setError
  } = useDashboardStore();
  const isMountedRef = useRef(true);

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
        { data: agendamentos, error: agendamentosError }
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
          .eq('empresa_uid', company.uid)
      ]);

      // Verificar erros
      if (eleitoresError) throw eleitoresError;
      if (atendimentosError) throw atendimentosError;
      if (oficiosError) throw oficiosError;
      if (requerimentosError) throw requerimentosError;
      if (projetosLeiError) throw projetosLeiError;
      if (agendamentosError) throw agendamentosError;

      const dashboardData = {
        totalAtendimentos: atendimentos?.length || 0,
        totalEleitores: eleitores?.length || 0,
        totalOficios: oficios?.length || 0,
        totalRequerimentos: requerimentos?.length || 0,
        totalProjetosLei: projetosLei?.length || 0,
        totalAgendamentos: agendamentos?.length || 0,
        evolucaoEleitores: {},
        evolucaoAtendimentos: {},
        atendimentosPorStatus: {},
        distribuicaoBairro: [],
        eleitoresStats: processarEstatisticas(eleitores || [], sevenDaysAgo),
        atendimentosStats: processarEstatisticas(atendimentos || [], sevenDaysAgo),
        oficiosStats: processarEstatisticas(oficios || [], sevenDaysAgo),
        requerimentosStats: processarEstatisticas(requerimentos || [], sevenDaysAgo),
        projetosLeiStats: processarEstatisticas(projetosLei || [], sevenDaysAgo),
        agendamentosStats: processarEstatisticas(agendamentos || [], sevenDaysAgo)
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
    fetchData();

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
