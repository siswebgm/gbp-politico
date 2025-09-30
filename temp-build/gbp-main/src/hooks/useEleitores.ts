import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompanyStore } from '../store/useCompanyStore';
import { eleitorService } from '../services/eleitorService';
import { EleitorFormData, EleitorFilters } from '../types/eleitor';
import { useEffect } from 'react';
import { supabaseClient } from '../lib/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface UseEleitoresOptions {
  filters?: EleitorFilters;
  page?: number;
  pageSize?: number;
}

export function useEleitores({ 
  filters = {}, 
  page = 1, 
  pageSize = 15 
}: UseEleitoresOptions = {}) {
  const queryClient = useQueryClient();
  const company = useCompanyStore((state) => state.company);

  // Configuração do realtime
  useEffect(() => {
    if (!company?.uid) return;

    const channel = supabaseClient.channel(`eleitores_${company.uid}`);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gbp_eleitores'
        },
        async (_payload: RealtimePostgresChangesPayload<any>) => {
          await queryClient.invalidateQueries({
            queryKey: ['eleitores', company?.uid, filters, page, pageSize],
            exact: true
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gbp_deletados'
        },
        async (_payload: RealtimePostgresChangesPayload<any>) => {
          await queryClient.invalidateQueries({
            queryKey: ['eleitores', company?.uid, filters, page, pageSize],
            exact: true
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [company?.uid]); // Dependência apenas no company.uid

  // Busca os dados paginados
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['eleitores', company?.uid, filters, page, pageSize],
    queryFn: async () => {
      if (!company?.uid) {
        throw new Error('Empresa não encontrada');
      }
      const result = await eleitorService.list(company.uid, filters, page, pageSize);
      return result;
    },
    enabled: !!company?.uid,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    networkMode: 'always',
    retry: false
  });

  // Pré-carrega a próxima página
  useEffect(() => {
    if (data?.total && page * pageSize < data.total) {
      queryClient.prefetchQuery({
        queryKey: ['eleitores', company?.uid, filters, page + 1, pageSize],
        queryFn: async () => {
          if (!company?.uid) {
            throw new Error('Empresa não encontrada');
          }
          return eleitorService.list(company.uid, filters, page + 1, pageSize);
        },
      });
    }
  }, [data, page, pageSize, company?.uid, filters, queryClient]);

  const { mutateAsync: createEleitor } = useMutation({
    mutationFn: async (data: EleitorFormData) => {
      if (!company?.uid) {
        throw new Error('Empresa não encontrada');
      }
      const result = await eleitorService.create(data, company.uid);
      // Força um refetch após criar
      await refetch();
      return result;
    },
    onSuccess: () => {
      if (company?.uid) {
        queryClient.invalidateQueries({ queryKey: ['eleitores', company.uid, filters, page, pageSize] });
      }
    },
  });

  const { mutateAsync: updateEleitor } = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EleitorFormData }) => {
      const result = await eleitorService.update(id.toString(), data);
      // Força um refetch após atualizar
      await refetch();
      return result;
    },
    onSuccess: () => {
      if (company?.uid) {
        queryClient.invalidateQueries({ queryKey: ['eleitores', company.uid, filters, page, pageSize] });
      }
    },
  });

  const { mutateAsync: softDeleteEleitor } = useMutation({
    mutationFn: async (uid: string) => {
      const result = await eleitorService.softDelete(uid);
      // Força um refetch após deletar
      await refetch();
      return result;
    },
  });

  const { mutateAsync: deleteEleitor } = useMutation({
    mutationFn: async (uid: string) => {
      const result = await eleitorService.delete(uid);
      // Força um refetch após deletar
      await refetch();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eleitores', company.uid, filters, page, pageSize], exact: true });
    },
  });

  const { mutateAsync: exportEleitores } = useMutation({
    mutationFn: async () => {
      if (!company?.uid) {
        throw new Error('Empresa não encontrada');
      }
      return eleitorService.export(company.uid, filters);
    },
  });

  const { mutateAsync: sendMessage } = useMutation({
    mutationFn: ({ mensagem, filtros }: { mensagem: string; filtros: EleitorFilters }) => {
      if (!company?.uid) {
        throw new Error('Empresa não encontrada');
      }
      return eleitorService.sendWhatsAppMessage(mensagem, company.uid, { ...filters, ...filtros });
    },
  });

  return {
    eleitores: data?.data || [],
    isLoading,
    error,
    total: data?.total || 0,
    pageSize,
    currentPage: data?.currentPage || page,
    createEleitor,
    updateEleitor,
    deleteEleitor,
    softDeleteEleitor,
    exportEleitores,
    sendMessage
  };
}
