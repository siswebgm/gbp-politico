import { useState, useEffect } from 'react';
import { supabaseClient } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';

interface FilterOption {
  id: string;
  label: string;
  value: string;
  type: 'cidade' | 'bairro' | 'categoria' | 'genero';
}

export function useFilters() {
  const company = useCompanyStore((state) => state.company);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filterOptions, setFilterOptions] = useState<Record<string, FilterOption[]>>({
    cidade: [],
    bairro: [],
    categoria: [],
    genero: [
      { id: '1', value: 'masculino', label: 'Masculino', type: 'genero' },
      { id: '2', value: 'feminino', label: 'Feminino', type: 'genero' },
    ],
  });

  useEffect(() => {
    const loadCidades = async () => {
      if (!company?.uid) return;

      try {
        setLoading(true);
        const { data, error } = await supabaseClient
          .from('gbp_eleitores')
          .select('cidade')
          .eq('empresa_uid', company.uid)
          .not('cidade', 'is', null);

        if (error) throw error;

        const uniqueCities = [...new Set(data.map(item => item.cidade))];
        const cidadesFormatted: FilterOption[] = uniqueCities.map(cidade => ({
          id: cidade,
          value: cidade,
          label: cidade,
          type: 'cidade'
        }));

        setFilterOptions(prev => ({
          ...prev,
          cidade: cidadesFormatted
        }));
      } catch (err) {
        console.error('Erro ao carregar cidades:', err);
        setError('Erro ao carregar cidades');
      } finally {
        setLoading(false);
      }
    };

    loadCidades();
  }, [company?.uid]);

  const loadBairros = async (cidade: string) => {
    if (!company?.uid || !cidade) return;

    try {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('bairro')
        .eq('empresa_uid', company.uid)
        .eq('cidade', cidade)
        .not('bairro', 'is', null);

      if (error) throw error;

      const uniqueBairros = [...new Set(data.map(item => item.bairro))];
      const bairrosFormatted: FilterOption[] = uniqueBairros.map(bairro => ({
        id: bairro,
        value: bairro,
        label: bairro,
        type: 'bairro'
      }));

      setFilterOptions(prev => ({
        ...prev,
        bairro: bairrosFormatted
      }));
    } catch (err) {
      console.error('Erro ao carregar bairros:', err);
      setError('Erro ao carregar bairros');
    } finally {
      setLoading(false);
    }
  };

  return {
    filterOptions,
    setFilterOptions,
    loading,
    error,
    loadBairros
  };
}
