import { useQuery } from '@tanstack/react-query';
import { categoryTypesService } from '../services/categoryTypes';
import { useCompanyStore } from '../store/useCompanyStore';

export function useCategoryTypes() {
  const company = useCompanyStore((state) => state.company);

  return useQuery({
    queryKey: ['categoria-tipos', company?.uid],
    queryFn: () => categoryTypesService.list(company?.uid || ''),
    enabled: !!company?.uid
  });
}
