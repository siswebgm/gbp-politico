import { useState, useCallback } from 'react';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useAttendances } from './useAttendances';
import { useCompanyStore } from '../store/useCompanyStore';

export function useAttendancesRealtime(voterId?: number) {
  const { attendances, createAttendance, updateAttendance, deleteAttendance } = useAttendances(voterId);
  const [isRealtime, setIsRealtime] = useState(true);
  const company = useCompanyStore((state) => state.company);

  useRealtimeSubscription({
    table: 'gbp_atendimentos',
    onInsert: () => {
      if (isRealtime) {
        console.log('Refetching attendances after insert...');
        attendances.refetch();
      }
    },
    onUpdate: () => {
      if (isRealtime) {
        console.log('Refetching attendances after update...');
        attendances.refetch();
      }
    },
    onDelete: () => {
      if (isRealtime) {
        console.log('Refetching attendances after delete...');
        attendances.refetch();
      }
    },
    filter: voterId ? `eleitor_id=eq.${voterId}` : undefined
  });

  const toggleRealtime = useCallback(() => {
    setIsRealtime(prev => !prev);
  }, []);

  return {
    attendances: attendances.data || [],
    loading: attendances.isLoading,
    error: attendances.error as Error | null,
    createAttendance,
    updateAttendance,
    deleteAttendance,
    isRealtime,
    toggleRealtime,
  };
}