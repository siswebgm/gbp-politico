import { useQuery } from '@tanstack/react-query';
import { useCompanyStore } from '../store/useCompanyStore';
import { companyService } from '../services/companies';

export function useCompanyData() {
  const company = useCompanyStore((state) => state.company);

  return useQuery({
    queryKey: ['company', company?.id],
    queryFn: () => company?.id ? companyService.getById(company.id) : null,
    enabled: !!company?.id,
  });
}