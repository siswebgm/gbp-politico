import { supabaseClient } from '../../../lib/supabase';
import type { ElectionFilters, ElectionStats } from '../../../types/election';

export async function getStats(filters: ElectionFilters = {}): Promise<ElectionStats> {
  try {
    let query = supabaseClient
      .from('eleicoes_2024_ver_paulista_pe')
      .select(`
        qt_aptos,
        qt_comparecimento,
        qt_abstencoes,
        qt_votos_nominais,
        qt_votos
      `);

    // Apply filters
    if (filters.sg_uf) query = query.eq('sg_uf', filters.sg_uf);
    if (filters.nm_municipio) query = query.eq('nm_municipio', filters.nm_municipio);
    if (filters.nr_zona) query = query.eq('nr_zona', filters.nr_zona);
    if (filters.nm_local_votacao) query = query.ilike('nm_local_votacao', `%${filters.nm_local_votacao}%`);
    if (filters.ds_cargo) query = query.eq('ds_cargo', filters.ds_cargo);
    if (filters.nr_votavel) query = query.eq('nr_votavel', filters.nr_votavel);
    if (filters.nm_votavel) query = query.ilike('nm_votavel', `%${filters.nm_votavel}%`);

    // Get aggregated stats
    const { data, error } = await query
      .select('sum(qt_aptos), sum(qt_comparecimento), sum(qt_abstencoes), sum(qt_votos_nominais), sum(qt_votos)')
      .single();

    if (error) throw error;

    return {
      qt_aptos: data?.sum?.qt_aptos || 0,
      qt_comparecimento: data?.sum?.qt_comparecimento || 0,
      qt_abstencoes: data?.sum?.qt_abstencoes || 0,
      qt_votos_nominais: data?.sum?.qt_votos_nominais || 0,
      qt_votos: data?.sum?.qt_votos || 0,
    };
  } catch (error) {
    console.error('Error fetching election stats:', error);
    throw error;
  }
}