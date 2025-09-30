import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useCompanyStore } from '../store/useCompanyStore';

export interface Indicadores {
  totalEleitores: number;
  novosEleitores: number;
  bairrosAlcancados: number;
  taxaConversao: number;
  crescimentoTotalEleitores?: number;
  crescimentoNovosEleitores?: number;
  crescimentoTaxaConversao?: number;
  topBairros: { nome: string; total: number }[];
  distribuicaoGenero: { genero: string; total: number }[];
  categorias: { id: number; nome: string; total: number }[];
}

export function useIndicadores() {
  const { user } = useAuth();
  const { company } = useCompanyStore();

  return useQuery({
    queryKey: ['indicadores', company?.id],
    queryFn: async () => {
      if (!company?.id) {
        throw new Error('ID da empresa não encontrado');
      }

      // Buscar total de eleitores e crescimento
      const { data: eleitoresData, error: eleitoresError } = await supabaseClient
        .from('gbp_eleitores')
        .select('id, created_at')
        .eq('empresa_id', company.id);

      if (eleitoresError) throw eleitoresError;

      // Calcular totais
      const totalEleitores = eleitoresData?.length || 0;
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const novosEleitores = eleitoresData?.filter(
        e => new Date(e.created_at) >= inicioMes
      ).length || 0;

      // Buscar bairros únicos
      const { data: bairrosData, error: bairrosError } = await supabaseClient
        .from('gbp_eleitores')
        .select('bairro')
        .eq('empresa_id', company.id)
        .not('bairro', 'is', null);

      if (bairrosError) throw bairrosError;

      const bairrosUnicos = new Set(bairrosData?.map(e => e.bairro));
      const bairrosAlcancados = bairrosUnicos.size;

      // Buscar distribuição por categorias
      const { data: categoriasData, error: categoriasError } = await supabaseClient
        .from('gbp_categorias')
        .select(`
          id,
          nome,
          gbp_eleitores (
            count
          )
        `)
        .eq('empresa_id', company.id);

      if (categoriasError) throw categoriasError;

      const categorias = categoriasData?.map(cat => ({
        id: cat.id,
        nome: cat.nome,
        total: cat.gbp_eleitores[0]?.count || 0
      })) || [];

      // Calcular taxa de conversão (exemplo: porcentagem de eleitores em categorias)
      const eleitoresEmCategorias = categorias.reduce((acc, cat) => acc + cat.total, 0);
      const taxaConversao = totalEleitores > 0 
        ? Math.round((eleitoresEmCategorias / totalEleitores) * 100) 
        : 0;

      // Buscar top 5 bairros
      const { data: topBairrosData, error: topBairrosError } = await supabaseClient
        .from('gbp_eleitores')
        .select('bairro')
        .eq('empresa_id', company.id)
        .not('bairro', 'is', null);

      if (topBairrosError) throw topBairrosError;

      const bairrosContagem = topBairrosData?.reduce((acc, curr) => {
        acc[curr.bairro] = (acc[curr.bairro] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topBairros = Object.entries(bairrosContagem || {})
        .map(([nome, total]) => ({ nome, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // Buscar distribuição por gênero
      const { data: generoData, error: generoError } = await supabaseClient
        .from('gbp_eleitores')
        .select('genero')
        .eq('empresa_id', company.id)
        .not('genero', 'is', null);

      if (generoError) throw generoError;

      const generoContagem = generoData?.reduce((acc, curr) => {
        acc[curr.genero] = (acc[curr.genero] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const distribuicaoGenero = Object.entries(generoContagem || {})
        .map(([genero, total]) => ({ genero, total }));

      return {
        totalEleitores,
        novosEleitores,
        bairrosAlcancados,
        taxaConversao,
        crescimentoTotalEleitores: 0, // Implementar cálculo de crescimento
        crescimentoNovosEleitores: 0, // Implementar cálculo de crescimento
        crescimentoTaxaConversao: 0, // Implementar cálculo de crescimento
        topBairros,
        distribuicaoGenero,
        categorias
      } as Indicadores;
    },
    enabled: !!company?.id,
  });
}
