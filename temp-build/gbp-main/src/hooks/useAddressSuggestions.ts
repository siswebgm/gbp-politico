import { useState, useEffect } from 'react';
import { supabaseClient } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

export interface AddressSuggestion {
  logradouro: string;
  complemento: string;
  cidade: string;
  bairro: string;
  cep: string;
}

export function useAddressSuggestions(searchTerm: string) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchTerm || !user?.empresa_uid) return;

      setLoading(true);
      try {
        const { data, error } = await supabaseClient
          .from('gbp_eleitores')
          .select('logradouro, complemento, cidade, bairro, cep')
          .eq('empresa_uid', user.empresa_uid)
          .ilike('logradouro', `%${searchTerm}%`)
          .limit(10);

        if (error) throw error;

        // Remove duplicatas baseado no logradouro e filtra valores vazios
        const uniqueSuggestions = data
          ?.filter(item => item.logradouro && item.logradouro.trim())
          .reduce((acc, curr) => {
            const exists = acc.find(item => item.logradouro === curr.logradouro);
            if (!exists) {
              acc.push(curr);
            }
            return acc;
          }, [] as AddressSuggestion[]);

        setSuggestions(uniqueSuggestions);
      } catch (error) {
        console.error('Erro ao buscar sugestões:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce para evitar muitas requisições
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, user?.empresa_uid]);

  return { suggestions, loading };
}
