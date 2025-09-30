import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Responsavel {
  id: string;
  nome: string;
}

export function useResponsaveis() {
  const { data, isLoading, error } = useQuery<Responsavel[]>({
    queryKey: ['responsaveis'],
    queryFn: async () => {
      const response = await api.get('/responsaveis');
      // Garante que o retorno é um array
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  return {
    responsaveis: data || [], // Garante que sempre retorna um array
    isLoading,
    error,
  };
}
