import { supabaseClient } from '../../lib/supabase';

export interface FilterOptions {
  ufs: string[];
  municipios: string[];
  zonas: number[];
  locaisVotacao: string[];
  cargos: string[];
  nr_votavel: string[];
  nm_votavel: string[];
}

export async function getFilterOptions(): Promise<{
  ufs: string[];
  municipios: string[];
  zonas: number[];
  locaisVotacao: string[];
  cargos: string[];
  nr_votavel: string[];
  nm_votavel: string[];
}> {
  try {
    const { data, error } = await supabaseClient
      .from('eleicoes_2024_ver_paulista_pe')
      .select(`
        sg_uf,
        nm_municipio,
        nr_zona,
        nm_local_votacao,
        ds_cargo,
        nr_votavel,
        nm_votavel
      `);

    if (error) throw error;

    const options: {
      ufs: string[];
      municipios: string[];
      zonas: number[];
      locaisVotacao: string[];
      cargos: string[];
      nr_votavel: string[];
      nm_votavel: string[];
    } = {
      ufs: [...new Set(data.map(item => item.sg_uf).filter(Boolean))],
      municipios: [...new Set(data.map(item => item.nm_municipio).filter(Boolean))],
      zonas: [...new Set(data.map(item => item.nr_zona).filter(Boolean))],
      locaisVotacao: [...new Set(data.map(item => item.nm_local_votacao).filter(Boolean))],
      cargos: [...new Set(data.map(item => item.ds_cargo).filter(Boolean))],
      nr_votavel: [...new Set(data.map(item => item.nr_votavel).filter(Boolean))],
      nm_votavel: [...new Set(data.map(item => item.nm_votavel).filter(Boolean))],
    };

    return options;
  } catch (error) {
    console.error('Error fetching filter options:', error);
    throw error;
  }
}