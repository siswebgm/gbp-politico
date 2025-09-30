export interface DashboardData {
  totalAtendimentos: number;
  totalEleitores: number;
  totalOficios: number;
  totalRequerimentos: number;
  totalProjetosLei: number;
  totalAgendamentos: number;
  atendimentosStats: StatsData;
  eleitoresStats: StatsData;
  oficiosStats: StatsData;
  requerimentosStats: StatsData;
  projetosLeiStats: StatsData;
  agendamentosStats: StatsData;
}

export interface StatsData {
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