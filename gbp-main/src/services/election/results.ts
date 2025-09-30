import { supabaseClient } from '../../lib/supabase';
import type { ElectionResult, ElectionFilters } from '../../types/election';

const PAGE_SIZE = 10;

export async function getResults(
  filters: ElectionFilters = {},
  page: number = 1
): Promise<{ data: ElectionResult[]; total: number }> {
  try {
    let query = supabaseClient
      .from('eleicoes_2024_ver_paulista_pe')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.sg_uf) {
      query = query.eq('sg_uf', filters.sg_uf);
    }
    if (filters.nm_municipio) {
      query = query.eq('nm_municipio', filters.nm_municipio);
    }
    if (filters.nr_zona) {
      query = query.eq('nr_zona', filters.nr_zona);
    }
    if (filters.nm_local_votacao) {
      query = query.ilike('nm_local_votacao', `%${filters.nm_local_votacao}%`);
    }
    if (filters.ds_cargo) {
      query = query.eq('ds_cargo', filters.ds_cargo);
    }
    if (filters.nr_votavel) {
      query = query.eq('nr_votavel', filters.nr_votavel);
    }
    if (filters.nm_votavel) {
      query = query.ilike('nm_votavel', `%${filters.nm_votavel}%`);
    }

    // Pagination
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await query
      .order('nm_local_votacao', { ascending: true, nullsFirst: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
    };
  } catch (error) {
    console.error('Error fetching election results:', error);
    throw error;
  }
}