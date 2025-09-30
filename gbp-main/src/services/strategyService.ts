import { supabaseClient } from '../lib/supabase';

export interface StrategyMetrics {
  topBairros: Array<{
    bairro: string;
    quantidade: number;
  }>;
  topIndicados: Array<{
    indicado_uid: string;
    nome: string;
    quantidade: number;
  }>;
  topCategorias: Array<{
    categoria_uid: string;
    nome: string;
    quantidade: number;
  }>;
  distribuicaoGenero: Array<{
    genero: string;
    quantidade: bigint;
  }>;
  distribuicaoConfiabilidade: Array<{
    confiabilidade_do_voto: string;
    quantidade: number;
    emoji: string;
  }>;
}

export interface PriorityArea {
  nome: string;
  eleitores: number;
  taxaEngajamento: number;
  potencialVotos: number;
}

export class StrategyService {
  private static instance: StrategyService;
  private constructor() {}

  static getInstance() {
    if (!StrategyService.instance) {
      StrategyService.instance = new StrategyService();
    }
    return StrategyService.instance;
  }

  async getStrategyMetrics(empresaUid: string): Promise<StrategyMetrics> {
    try {
      // Top 3 Bairros
      const { data: topBairros, error: errorBairros } = await supabaseClient
        .rpc('get_top_bairros', { empresa_uid: empresaUid });
      console.log('Dados bairros:', topBairros, 'Erro:', errorBairros);

      // Top Indicados
      const { data: topIndicados, error: errorIndicados } = await supabaseClient
        .rpc('get_top_indicados', { empresa_uid: empresaUid });
      console.log('Dados indicados:', topIndicados, 'Erro:', errorIndicados);

      // Top Categorias
      const { data: topCategorias, error: errorCategorias } = await supabaseClient
        .rpc('get_top_categorias', { empresa_uid: empresaUid });
      console.log('Dados categorias:', topCategorias, 'Erro:', errorCategorias);

      // Distribuição por Gênero
      const { data: generos, error: errorGeneros } = await supabaseClient
        .rpc('get_distribuicao_genero', { empresa_uid: empresaUid });
      console.log('Dados genero:', generos, 'Erro:', errorGeneros);

      // Distribuição por Confiabilidade
      const { data: confiabilidades, error: errorConfiabilidade } = await supabaseClient
        .rpc('get_distribuicao_confiabilidade', { empresa_uid: empresaUid });
      console.log('Dados confiabilidade:', confiabilidades, 'Erro:', errorConfiabilidade);

      return {
        topBairros: topBairros?.map((bairro: any) => ({
          bairro: bairro.bairro || 'Não informado',
          quantidade: bairro.quantidade || 0
        })) || [],
        topIndicados: topIndicados?.map((indicado: any) => ({
          indicado_uid: indicado.indicado_uid || 'Não informado',
          nome: indicado.nome || 'Não informado',
          quantidade: indicado.quantidade || 0
        })) || [],
        topCategorias: topCategorias?.map((categoria: any) => ({
          categoria_uid: categoria.categoria_uid || 'Não informado',
          nome: categoria.nome || 'Não informado',
          quantidade: categoria.quantidade || 0
        })) || [],
        distribuicaoGenero: generos?.map((genero: any) => ({
          genero: genero.genero || 'Não informado',
          quantidade: genero.quantidade || 0
        })) || [],
        distribuicaoConfiabilidade: confiabilidades?.map((confiabilidade: any) => ({
          confiabilidade_do_voto: confiabilidade.confiabilidade_do_voto || 'Não informado',
          quantidade: confiabilidade.quantidade || 0,
          emoji: confiabilidade.emoji || '⚪'
        })) || []
      };
    } catch (error) {
      console.error('Erro ao obter métricas:', error);
      return {
        topBairros: [],
        topIndicados: [],
        topCategorias: [],
        distribuicaoGenero: [],
        distribuicaoConfiabilidade: []
      };
    }
  }

  async getPriorityAreas(empresaUid: string): Promise<PriorityArea[]> {
    try {
      // Consulta eleitores por bairro
      const { data: eleitores } = await supabaseClient
        .from('gbp_eleitores')
        .select('bairro, atendimento, status')
        .eq('empresa_uid', empresaUid)
        .eq('status', 'ativo');

      if (!eleitores) return [];

      // Agrupa por bairro
      const areas = Array.from(
        eleitores.reduce((acc, eleitor) => {
          const bairro = eleitor.bairro || 'Não informado';
          if (!acc.has(bairro)) {
            acc.set(bairro, { nome: bairro, eleitores: 0, taxaEngajamento: 0, potencialVotos: 0 });
          }
          const area = acc.get(bairro)!;
          area.eleitores += 1;
          if (eleitor.atendimento) {
            area.taxaEngajamento += 1;
          }
          area.potencialVotos += 1;
          return acc;
        }, new Map<string, PriorityArea>()).values()
      );

      // Calcula porcentagens e ordena por potencial de votos
      return areas
        .map(area => ({
          ...area,
          taxaEngajamento: Math.round((area.taxaEngajamento / area.eleitores) * 100),
          potencialVotos: Math.round(area.potencialVotos * (area.taxaEngajamento / 100))
        }))
        .sort((a, b) => b.potencialVotos - a.potencialVotos)
        .slice(0, 3); // Pega as 3 áreas com maior potencial
    } catch (error) {
      console.error('Erro ao obter áreas prioritárias:', error);
      return [];
    }
  }
}
