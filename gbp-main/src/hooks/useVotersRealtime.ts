import { useState, useCallback } from 'react';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useVoters } from './useVoters';
import type { Database } from '../types/supabase';

type Voter = Database['public']['Tables']['gbp_eleitores']['Row'];

export function useVotersRealtime() {
  const { voters, createVoter, updateVoter, deleteVoter } = useVoters();
  const [isRealtime, setIsRealtime] = useState(true);

  useRealtimeSubscription({
    table: 'gbp_eleitores',
    onInsert: () => {
      if (isRealtime) {
        voters.refetch();
      }
    },
    onUpdate: () => {
      if (isRealtime) {
        voters.refetch();
      }
    },
    onDelete: () => {
      if (isRealtime) {
        voters.refetch();
      }
    },
  });

  const toggleRealtime = useCallback(() => {
    setIsRealtime(prev => !prev);
  }, []);

  return {
    voters: voters.data || [],
    loading: voters.isLoading,
    error: voters.error as Error | null,
    createVoter,
    updateVoter,
    deleteVoter,
    isRealtime,
    toggleRealtime,
  };
}