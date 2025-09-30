import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';
import { CategoriaTipo, categoriaTipoService } from '../services/categories';
import { useEffect } from 'react';

export function useCategoriaTipos() {
  const company = useCompanyStore((state) => state.company);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<CategoriaTipo[]>({
    queryKey: ['categoria-tipos', company?.uid],
    queryFn: async () => {
      if (!company?.uid) {
        return [];
      }

      const { data, error } = await supabaseClient
        .from('gbp_categoria_tipos')
        .select('*')
        .eq('empresa_uid', company.uid)
        .order('nome');

      if (error) {
        console.error('useCategoriaTipos: Erro ao buscar tipos:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!company?.uid,
  });

  // Configuração do Realtime
  useEffect(() => {
    if (!company?.uid) return;

    const channel = supabaseClient
      .channel('categoria-tipos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gbp_categoria_tipos',
          filter: `empresa_uid=eq.${company.uid}`
        },
        () => {
          // Atualiza os dados quando houver mudanças
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [company?.uid, refetch]);

  const createTipo = useMutation({
    mutationFn: async (data: Omit<CategoriaTipo, 'uid' | 'id' | 'created_at'>) => {
      if (!company?.uid) throw new Error('Empresa não selecionada');
      return categoriaTipoService.create({
        ...data,
        empresa_uid: company.uid,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categoria-tipos', company?.uid] });
    },
  });

  const updateTipo = useMutation({
    mutationFn: async ({ uid, ...data }: { uid: string } & Partial<Omit<CategoriaTipo, 'uid' | 'id' | 'created_at' | 'empresa_uid'>>) => {
      return categoriaTipoService.update(uid, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categoria-tipos', company?.uid] });
    },
  });

  return {
    tipos: data,
    isLoading,
    error,
    createTipo: createTipo.mutateAsync,
    updateTipo: updateTipo.mutateAsync,
    refetch
  };
}
