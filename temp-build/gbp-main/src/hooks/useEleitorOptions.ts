import { useQuery } from '@tanstack/react-query';
import { eleitorService } from '../services/eleitorService';
import { useCompanyStore } from '../store/useCompanyStore';
import { useCategories } from './useCategories';

interface Option {
  value: string;
  label: string;
}

export function useEleitorOptions() {
  const company = useCompanyStore((state) => state.company);
  const empresa_uid = company?.uid;

  const { data: categorias = [] } = useCategories('eleitor');

  const { data: indicadoresData = [], isLoading: isLoadingIndicadores } = useQuery({
    queryKey: ['eleitor-indicadores', empresa_uid],
    queryFn: async () => {
      if (!empresa_uid) return [];
      const data = await eleitorService.getIndicadoresOptions(empresa_uid);
      return data.map(item => ({
        value: item.uid,
        label: item.nome
      }));
    },
    enabled: !!empresa_uid,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  const { data: responsaveisData = [], isLoading: isLoadingResponsaveis } = useQuery({
    queryKey: ['eleitor-responsaveis', empresa_uid],
    queryFn: async () => {
      if (!empresa_uid) return [];
      const data = await eleitorService.getResponsaveisOptions(empresa_uid);
      return data.map(item => ({
        value: item.uid,
        label: item.nome
      }));
    },
    enabled: !!empresa_uid,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  return {
    categorias: categorias.map(cat => ({ value: cat.uid, label: cat.nome })),
    indicadores: indicadoresData,
    responsaveis: responsaveisData,
    isLoading: isLoadingIndicadores || isLoadingResponsaveis,
  };
}
