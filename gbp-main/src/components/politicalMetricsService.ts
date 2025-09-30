import { Eleitor } from '../types/eleitor';
import { supabaseClient } from '../lib/supabase';

interface PoliticalMetrics {
  coverageByZone: Array<{
    zone: number;
    totalVoters: number;
    attended: number;
    coverageRate: number;
  }>;
  engagementByNeighborhood: Array<{
    neighborhood: string;
    totalVoters: number;
    attended: number;
    engagementRate: number;
  }>;
  whatsappConversion: {
    totalVoters: number;
    withWhatsapp: number;
    conversionRate: number;
  };
  growthTrends: Array<{
    neighborhood: string;
    growthRate: number;
  }>;
  responsiblePerformance: Array<{
    responsible: string;
    totalIndications: number;
    conversionRate: number;
  }>;
  responseTime: {
    averageTime: number;
    targetTime: number;
  };
}

export const politicalMetricsService = {
  async getMetrics(): Promise<PoliticalMetrics> {
    // Buscar dados dos eleitores
    const { data: voters } = await supabaseClient
      .from('gbp_eleitores')
      .select('*')
      .eq('empresa_uid', localStorage.getItem('empresa_uid'));

    // Buscar dados dos atendimentos
    const { data: attendances } = await supabaseClient
      .from('gbp_atendimentos')
      .select('*')
      .eq('empresa_uid', localStorage.getItem('empresa_uid'));

    // Calcular métricas de cobertura por zona
    const coverageByZone = voters.reduce((acc: any[], voter) => {
      const zone = voter.zona;
      const existing = acc.find(z => z.zone === zone);
      if (existing) {
        existing.totalVoters++;
        if (voter.atendido) existing.attended++;
      } else {
        acc.push({
          zone,
          totalVoters: 1,
          attended: voter.atendido ? 1 : 0
        });
      }
      return acc;
    }, []).map(zone => ({
      ...zone,
      coverageRate: (zone.attended / zone.totalVoters * 100).toFixed(2)
    }));

    // Calcular métricas de engajamento por bairro
    const engagementByNeighborhood = voters.reduce((acc: any[], voter) => {
      const neighborhood = voter.bairro;
      const existing = acc.find(n => n.neighborhood === neighborhood);
      if (existing) {
        existing.totalVoters++;
        if (voter.atendido) existing.attended++;
      } else {
        acc.push({
          neighborhood,
          totalVoters: 1,
          attended: voter.atendido ? 1 : 0
        });
      }
      return acc;
    }, []).map(neighborhood => ({
      ...neighborhood,
      engagementRate: (neighborhood.attended / neighborhood.totalVoters * 100).toFixed(2)
    }));

    // Calcular taxa de conversão de WhatsApp
    const whatsappConversion = {
      totalVoters: voters.length,
      withWhatsapp: voters.filter(v => v.whatsapp).length,
      conversionRate: ((voters.filter(v => v.whatsapp).length / voters.length) * 100).toFixed(2)
    };

    // Calcular tendências de crescimento
    const growthTrends = voters.reduce((acc: any[], voter) => {
      const neighborhood = voter.bairro;
      const existing = acc.find(n => n.neighborhood === neighborhood);
      if (existing) {
        existing.total++;
        if (voter.data_cadastro) existing.recent++;
      } else {
        acc.push({
          neighborhood,
          total: 1,
          recent: voter.data_cadastro ? 1 : 0
        });
      }
      return acc;
    }, []).map(neighborhood => ({
      ...neighborhood,
      growthRate: (neighborhood.recent / neighborhood.total * 100).toFixed(2)
    }));

    // Calcular performance por responsável
    const responsiblePerformance = voters.reduce((acc: any[], voter) => {
      const responsible = voter.responsavel;
      const existing = acc.find(r => r.responsible === responsible);
      if (existing) {
        existing.totalIndications++;
        if (voter.atendido) existing.conversionRate++;
      } else {
        acc.push({
          responsible,
          totalIndications: 1,
          conversionRate: voter.atendido ? 1 : 0
        });
      }
      return acc;
    }, []).map(responsible => ({
      ...responsible,
      conversionRate: (responsible.conversionRate / responsible.totalIndications * 100).toFixed(2)
    }));

    // Calcular tempo médio de resposta
    const responseTime = {
      averageTime: attendances.length > 0 
        ? attendances.reduce((sum, a) => sum + (a.data_resposta ? Date.now() - new Date(a.data_resposta).getTime() : 0), 0) / attendances.length
        : 0,
      targetTime: 3600000 // 1 hora em milissegundos
    };

    return {
      coverageByZone,
      engagementByNeighborhood,
      whatsappConversion,
      growthTrends,
      responsiblePerformance,
      responseTime
    };
  }
};
