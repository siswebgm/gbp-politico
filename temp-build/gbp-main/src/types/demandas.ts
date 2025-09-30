import { DemandaRua } from '@/services/demandasRuasService';

export interface PeriodoRelatorio {
  inicio: string;
  fim: string;
}

export interface DadosRelatorioDemandas {
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
}

export interface EstatisticasDemandas {
  total: number;
  porStatus: Record<string, number>;
  porUrgencia: Record<string, number>;
  porTipo: Record<string, number>;
  evolucaoMensal: Array<{
    mes: string;
    total: number;
  }>;
}

export interface FiltroRelatorioDemandas {
  periodo: {
    inicio: Date;
    fim: Date;
  };
  status?: DemandaRua['status'][];
  nivelUrgencia?: DemandaRua['nivel_de_urgencia'][];
  tipoDemanda?: string[];
  bairro?: string[];
  comDocumento?: boolean;
}

export interface DadosGrafico {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}
