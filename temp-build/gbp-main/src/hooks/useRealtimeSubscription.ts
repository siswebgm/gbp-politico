import { useEffect } from 'react';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';

interface SubscriptionOptions {
  table: string;
  filter?: string;
}

export function useRealtimeSubscription({ table, filter }: SubscriptionOptions) {
  const company = useCompanyStore((state) => state.company);

  useEffect(() => {
    if (!company?.uid) return;

    const subscription = supabaseClient
      .channel('public:' + table)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter || `empresa_uid=eq.${company.uid}`
        },
        (payload) => {
          console.log('Change received!', payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [table, filter, company?.uid]);
}