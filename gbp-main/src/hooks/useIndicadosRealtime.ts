import { useState, useCallback } from 'react';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { indicadoService } from '../services/indicados';
import { useCompanyStore } from './useCompanyContext';
import type { Indicado } from '../types/indicado';

export function useIndicadosRealtime() {
  const { currentCompanyId } = useCompanyStore();
  const queryClient = useQueryClient();
  const [isRealtime, setIsRealtime] = useState(true);

  const { data: indicados, isLoading, error } = useQuery({
    queryKey: ['indicados', currentCompanyId],
    queryFn: () => indicadoService.list(currentCompanyId!),
    enabled: !!currentCompanyId,
  });

  useRealtimeSubscription({
    table: 'gbp_indicado',
    onInsert: () => {
      if (isRealtime) {
        queryClient.invalidateQueries({ queryKey: ['indicados', currentCompanyId] });
      }
    },
    onUpdate: () => {
      if (isRealtime) {
        queryClient.invalidateQueries({ queryKey: ['indicados', currentCompanyId] });
      }
    },
    onDelete: () => {
      if (isRealtime) {
        queryClient.invalidateQueries({ queryKey: ['indicados', currentCompanyId] });
      }
    },
  });

  const toggleRealtime = useCallback(() => {
    setIsRealtime(prev => !prev);
  }, []);

  return {
    indicados: indicados || [],
    isLoading,
    error,
    isRealtime,
    toggleRealtime,
  };
}