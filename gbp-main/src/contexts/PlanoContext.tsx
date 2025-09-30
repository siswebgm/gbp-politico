import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabaseClient } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { toast } from 'react-hot-toast';
import { addDays } from 'date-fns';

interface PlanoContextType {
  planoAtual: any | null;
  isLoading: boolean;
  carregarPlano: () => Promise<void>;
  atualizarPlano: (plano: any) => void;
}

const PlanoContext = createContext<PlanoContextType | undefined>(undefined);

export function PlanoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [planoAtual, setPlanoAtual] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const carregarPlano = async () => {
    if (!user?.empresa_uid) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabaseClient
        .from('gbp_planos')
        .select('*')
        .eq('empresa_uid', user.empresa_uid)
        .order('created_at', { ascending: false })
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPlanoAtual({
          ...data,
          status: getStatusPlano(data.data_fim)
        });
      } else {
        setPlanoAtual(null);
      }
    } catch (error) {
      console.error('Erro ao carregar plano:', error);
      toast.error('Erro ao carregar informações do plano');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusPlano = (dataFim: string | null): 'ativo' | 'expirado' | 'pendente' => {
    if (!dataFim) return 'pendente';
    const hoje = new Date();
    const dataFimPlano = new Date(dataFim);
    return dataFimPlano < hoje ? 'expirado' : 'ativo';
  };

  const atualizarPlano = (plano: any) => {
    setPlanoAtual(plano);
  };

  useEffect(() => {
    carregarPlano();
  }, [user?.empresa_uid]);

  return (
    <PlanoContext.Provider value={{ planoAtual, isLoading, carregarPlano, atualizarPlano }}>
      {children}
    </PlanoContext.Provider>
  );
}

export function usePlano() {
  const context = useContext(PlanoContext);
  if (context === undefined) {
    throw new Error('usePlano deve ser usado dentro de um PlanoProvider');
  }
  return context;
}
