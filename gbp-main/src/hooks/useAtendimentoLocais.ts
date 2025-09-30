import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';

export function useAtendimentoLocais() {
  const company = useCompanyStore((state) => state.company);

  const query = useQuery({
    queryKey: ['atendimento-locais', company?.uid],
    queryFn: async () => {
      if (!company?.uid) {
        console.log('Sem empresa definida');
        return { cidades: [], bairros: [] };
      }

      console.log('Buscando locais dos atendimentos para empresa:', company.uid);

      const { data, error } = await supabaseClient
        .from('gbp_atendimentos')
        .select('cidade, bairro')
        .eq('empresa_uid', company.uid)
        .not('cidade', 'is', null)
        .not('bairro', 'is', null);

      if (error) {
        console.error('Erro ao buscar locais:', error);
        throw error;
      }

      // Agrupa os bairros por cidade
      const locaisPorCidade = data.reduce((acc, item) => {
        if (item.cidade && item.bairro) {
          if (!acc[item.cidade]) {
            acc[item.cidade] = new Set();
          }
          acc[item.cidade].add(item.bairro);
        }
        return acc;
      }, {} as Record<string, Set<string>>);

      // Converte para o formato final
      const cidades = Object.keys(locaisPorCidade).sort((a, b) => a.localeCompare(b));
      const bairrosPorCidade = Object.fromEntries(
        Object.entries(locaisPorCidade).map(([cidade, bairrosSet]) => [
          cidade,
          [...bairrosSet].sort((a, b) => a.localeCompare(b))
        ])
      );

      console.log('Locais únicos encontrados:', {
        cidades: cidades.length,
        bairrosPorCidade: Object.values(bairrosPorCidade).flat().length
      });
      
      return { cidades, bairrosPorCidade };
    },
    enabled: !!company?.uid,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  return query;
}
