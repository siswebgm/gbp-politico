import { useQuery } from '@tanstack/react-query';
import { supabaseClient as supabase } from '../lib/supabase';
import { ResultadoEleicao } from '../types/eleicoes';

export function useEleicaoVereador(options?: {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}) {
  const {
    page = 1,
    pageSize = 50,
    orderBy = 'nr_zona',
    orderDirection = 'asc',
    filters = {},
  } = options || {};

  return useQuery({
    queryKey: ['eleicoes_vereador', page, pageSize, orderBy, orderDirection, filters],
    queryFn: async () => {
      let query = supabase
        .from('eleicoes_vereador')
        .select('*', { count: 'exact' });

      // Aplicar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query = query.eq(key, value);
        }
      });

      // Aplicar ordenação
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });

      // Aplicar paginação
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching eleicoes_vereador:', error);
        throw error;
      }

      return {
        data: data as ResultadoEleicao[],
        totalCount: count || 0,
        currentPage: page,
        pageSize,
        totalPages: count ? Math.ceil(count / pageSize) : 0,
      };
    },
  });
}
