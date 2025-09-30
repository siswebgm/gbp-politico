import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../../lib/supabase";
import { useCompanyStore } from "../../../store/useCompanyStore";
import { useAuth } from '../../../hooks/useAuth';

export interface FilterOption {
  value: string;
  label: string;
}

export function useFilterOptions() {
  const company = useCompanyStore(state => state.company);
  const { user } = useAuth();

  // Queries
  const citiesQuery = useQuery({
    queryKey: ['disparo-midia-cities', company?.uid],
    queryFn: async () => {
      try {
        if (!company?.uid) return [];

        const { data, error } = await supabaseClient
          .from('gbp_eleitores')
          .select('cidade')
          .eq('empresa_uid', company.uid)
          .neq('cidade', null)
          .neq('cidade', '')
          .order('cidade');

        if (error) throw error;

        // Filtrar valores únicos no JavaScript
        const uniqueCities = [...new Set(
          (data || [])
            .map(item => item.cidade?.trim())
            .filter(Boolean)
        )].sort();

        return uniqueCities.map(city => ({
          value: city,
          label: city
        }));
      } catch (error) {
        console.error('Erro ao buscar cidades:', error);
        return [];
      }
    },
    enabled: !!company?.uid
  });

  const neighborhoodsQuery = useQuery({
    queryKey: ['disparo-midia-neighborhoods', company?.uid],
    queryFn: async () => {
      try {
        if (!company?.uid) return [];

        const { data, error } = await supabaseClient
          .from('gbp_eleitores')
          .select('bairro')
          .eq('empresa_uid', company.uid)
          .neq('bairro', null)
          .neq('bairro', '')
          .order('bairro');

        if (error) throw error;

        // Filtrar valores únicos no JavaScript
        const uniqueNeighborhoods = [...new Set(
          (data || [])
            .map(item => item.bairro?.trim())
            .filter(Boolean)
        )].sort();

        return uniqueNeighborhoods.map(neighborhood => ({
          value: neighborhood,
          label: neighborhood
        }));
      } catch (error) {
        console.error('Erro ao buscar bairros:', error);
        return [];
      }
    },
    enabled: !!company?.uid
  });

  return {
    cities: citiesQuery.data || [],
    neighborhoods: neighborhoodsQuery.data || [],
    isLoading: citiesQuery.isLoading || neighborhoodsQuery.isLoading,
    isError: citiesQuery.isError || neighborhoodsQuery.isError
  };
}
