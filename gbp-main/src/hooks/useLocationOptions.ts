import { useState, useEffect } from 'react';
import { supabaseClient } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

export interface LocationOptions {
  cities: string[];
  neighborhoods: string[];
  loading: boolean;
}

export function useLocationOptions() {
  const [options, setOptions] = useState<LocationOptions>({
    cities: [],
    neighborhoods: [],
    loading: true
  });
  const { user } = useAuth();

  useEffect(() => {
    const fetchOptions = async () => {
      if (!user?.empresa_uid) return;

      try {
        // Buscar cidades únicas
        const { data: citiesData, error: citiesError } = await supabaseClient
          .from('gbp_eleitores')
          .select('cidade')
          .eq('empresa_uid', user.empresa_uid)
          .not('cidade', 'is', null);

        if (citiesError) throw citiesError;

        // Buscar bairros únicos
        const { data: neighborhoodsData, error: neighborhoodsError } = await supabaseClient
          .from('gbp_eleitores')
          .select('bairro')
          .eq('empresa_uid', user.empresa_uid)
          .not('bairro', 'is', null);

        if (neighborhoodsError) throw neighborhoodsError;

        // Remover duplicatas e ordenar
        const uniqueCities = Array.from(new Set(
          citiesData
            .map(item => item.cidade)
            .filter(Boolean)
            .map(city => city.trim())
        )).sort();

        const uniqueNeighborhoods = Array.from(new Set(
          neighborhoodsData
            .map(item => item.bairro)
            .filter(Boolean)
            .map(neighborhood => neighborhood.trim())
        )).sort();

        setOptions({
          cities: uniqueCities,
          neighborhoods: uniqueNeighborhoods,
          loading: false
        });
      } catch (error) {
        console.error('Erro ao buscar opções de localização:', error);
        setOptions(prev => ({ ...prev, loading: false }));
      }
    };

    fetchOptions();
  }, [user?.empresa_uid]);

  return options;
}
