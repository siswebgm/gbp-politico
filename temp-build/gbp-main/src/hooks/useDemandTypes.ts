import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../lib/supabase';

export interface DemandType {
  id: number;
  name: string;
  category: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export function useDemandTypes(companyId?: string) {
  return useQuery({
    queryKey: ['demandTypes', companyId],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('demand_types')
        .select('*')
        .eq('company_id', companyId)
        .order('category')
        .order('name');

      if (error) {
        throw error;
      }

      return data as DemandType[];
    },
    enabled: !!companyId,
  });
}
