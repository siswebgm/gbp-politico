import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';

export function useAtendimentoIndicados() {
  const company = useCompanyStore((state) => state.company);

  const query = useQuery({
    queryKey: ['atendimento-indicados', company?.uid],
    queryFn: async () => {
      if (!company?.uid) {
        console.log('Sem empresa definida');
        return [];
      }

      console.log('Buscando indicados dos atendimentos para empresa:', company.uid);

      const { data, error } = await supabaseClient
        .from('gbp_atendimentos')
        .select('indicado')
        .eq('empresa_uid', company.uid)
        .not('indicado', 'is', null)
        .order('indicado');

      if (error) {
        console.error('Erro ao buscar indicados:', error);
        throw error;
      }

      // Remove duplicatas e valores vazios
      const uniqueIndicados = [...new Set(data.map(item => item.indicado))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      console.log('Indicados únicos encontrados:', uniqueIndicados.length);
      return uniqueIndicados;
    },
    enabled: !!company?.uid,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  return query;
}
