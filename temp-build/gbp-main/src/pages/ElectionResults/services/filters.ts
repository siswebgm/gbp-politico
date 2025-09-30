import { supabase } from '../../../lib/supabase';
import type { FilterOptions } from '../../../types/election';

export async function getFilterOptions(): Promise<FilterOptions> {
  try {
    const { data, error } = await supabase
      .from('eleicoes_2024_ver_paulista_pe')
      .select(`
        sg_uf,
        nm_municipio,
        nr_zona,
        nm_local_votacao,
        ds_cargo
      `);

    if (error) throw error;

    const options: FilterOptions = {
      ufs: [...new Set(data.map(item => item.sg_uf).filter(Boolean))],
      municipios: [...new Set(data.map(item => item.nm_municipio).filter(Boolean))],
      zonas: [...new Set(data.map(item => item.nr_zona).filter(Boolean))],
      locaisVotacao: [...new Set(data.map(item => item.nm_local_votacao).filter(Boolean))],
      cargos: [...new Set(data.map(item => item.ds_cargo).filter(Boolean))],
    };

    return options;
  } catch (error) {
    console.error('Error fetching filter options:', error);
    throw error;
  }
}