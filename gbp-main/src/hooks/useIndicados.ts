import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';
import { useEffect } from 'react';

interface Indicado {
  uid: string;
  nome: string;
}

export function useIndicados() {
  const company = useCompanyStore((state) => state.company);
  const queryClient = useQueryClient();

  const query = useQuery<Indicado[]>({
    queryKey: ['indicados', company?.uid],
    queryFn: async () => {
      if (!company?.uid) {
        console.log('Sem empresa definida');
        return [];
      }

      console.log('Buscando indicados para empresa:', company.uid);

      const { data, error } = await supabaseClient
        .from('gbp_indicado')
        .select('uid, nome')
        .eq('empresa_uid', company.uid)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar indicados:', error);
        throw error;
      }

      console.log('Indicados encontrados:', data?.length);
      return data || [];
    },
    enabled: !!company?.uid,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  // Configurar realtime subscription
  useEffect(() => {
    if (!company?.uid) return;

    const subscription = supabaseClient
      .channel('indicados-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gbp_indicado',
          filter: `empresa_uid=eq.${company.uid}`
        },
        () => {
          // Invalidar o cache quando houver mudanças
          queryClient.invalidateQueries({ queryKey: ['indicados', company.uid] });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [company?.uid, queryClient]);

  return query;
}
