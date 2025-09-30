import { createContext, useContext, useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { useCompanyStore } from '../stores/companyStore';

interface Company {
  uid: string;
  nome: string;
  created_at: string;
}

interface CompanyContextType {
  currentCompanyId: string | null;
  company: Company | null;
  isLoading: boolean;
  error: Error | null;
  setCurrentCompanyId: (id: string) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const setCompanyStore = useCompanyStore((state) => state.setCompany);

  useEffect(() => {
    async function loadCompany() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Buscar empresa do usuário
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select('empresa_uid')
          .eq('uid', user.uid)
          .single();

        if (userError) throw userError;

        if (userData?.empresa_uid) {
          setCurrentCompanyId(userData.empresa_uid);

          // Buscar dados da empresa
          const { data: companyData, error: companyError } = await supabaseClient
            .from('gbp_empresas')
            .select('*')
            .eq('uid', userData.empresa_uid)
            .single();

          if (companyError) throw companyError;
          
          setCompany(companyData);
          setCompanyStore(companyData);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Erro ao carregar empresa'));
        console.error('Erro ao carregar empresa:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCompany();
  }, [user, setCompanyStore]);

  const value = {
    currentCompanyId,
    company,
    isLoading,
    error,
    setCurrentCompanyId,
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
