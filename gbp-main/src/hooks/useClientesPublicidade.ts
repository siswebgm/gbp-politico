import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../lib/supabase';

export interface ClientePublicidade {
  uid: string;
  nome: string;
  cargo: string;
  foto: string;
  cidade: string;
  uf: string;
  partido: string;
  created_at: string;
}

export function useClientesPublicidade() {
  return useQuery({
    queryKey: ['clientes-publicidade'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('clientes_publicidade')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data as ClientePublicidade[];
    }
  });
}
