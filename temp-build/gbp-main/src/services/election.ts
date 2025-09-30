```typescript
import { supabase } from '../lib/supabase';
import type { ElectionResult, ElectionFilters, ElectionStats } from '../types/election';

const PAGE_SIZE = 10;

export const electionService = {
  getResults: async (
    filters: ElectionFilters = {},
    page: number = 1
  ): Promise<{ data: ElectionResult[]; total: number }> => {
    try {
      let query = supabase
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
        .order('qt_votos', { ascending: false })
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
  },

  getStats: async (filters: ElectionFilters = {}): Promise<ElectionStats> => {
    try {
      let query = supabase
        .from('eleicoes_2024_ver_paulista_pe')
        .select(`
          qt_aptos,
          qt_comparecimento,
          qt_abstencoes,
          qt_votos_nominais,
          qt_votos
        `);

      // Apply the same filters
      if (filters.sg_uf) query = query.eq('sg_uf', filters.sg_uf);
      if (filters.nm_municipio) query = query.eq('nm_municipio', filters.nm_municipio);
      if (filters.nr_zona) query = query.eq('nr_zona', filters.nr_zona);
      if (filters.nm_local_votacao) query = query.ilike('nm_local_votacao', `%${filters.nm_local_votacao}%`);
      if (filters.ds_cargo) query = query.eq('ds_cargo', filters.ds_cargo);
      if (filters.nr_votavel) query = query.eq('nr_votavel', filters.nr_votavel);
      if (filters.nm_votavel) query = query.ilike('nm_votavel', `%${filters.nm_votavel}%`);

      const { data, error } = await query.single();

      if (error) throw error;

      return {
        qt_aptos: data?.qt_aptos || 0,
        qt_comparecimento: data?.qt_comparecimento || 0,
        qt_abstencoes: data?.qt_abstencoes || 0,
        qt_votos_nominais: data?.qt_votos_nominais || 0,
        qt_votos: data?.qt_votos || 0,
      };
    } catch (error) {
      console.error('Error fetching election stats:', error);
      throw error;
    }
  },
};
```