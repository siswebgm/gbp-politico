import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabase';

interface Company {
  id: number;
  nome: string;
  uid: string;
}

export function useCompany() {
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCompany() {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) {
          setCompany(null);
          return;
        }

        const { data: companyData } = await supabaseClient
          .from('gbp_empresa')
          .select('*')
          .eq('uid', user.user_metadata.empresa_uid)
          .single();

        if (companyData) {
          setCompany(companyData);
        }
      } catch (error) {
        console.error('Error loading company:', error);
        setCompany(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadCompany();
  }, []);

  return company;
}
