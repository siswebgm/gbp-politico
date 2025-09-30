import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eleitorService } from '../services/eleitorService';
import { useCompanyStore } from '../store/useCompanyStore';

export function useCheckCpf(cpf: string | undefined) {
  const company = useCompanyStore((state) => state.company);

  const checkCpf = useCallback(async () => {
    if (!cpf) {
      console.log('useCheckCpf - CPF não fornecido');
      return false;
    }
    
    if (!company?.id) {
      console.log('useCheckCpf - ID da empresa não encontrado');
      return false;
    }
    
    // Remove caracteres especiais do CPF
    const cleanCpf = cpf.replace(/[^\d]/g, '');
    console.log('useCheckCpf - CPF limpo:', cleanCpf);
    
    // Só verifica se o CPF tem 11 dígitos
    if (cleanCpf.length !== 11) {
      console.log('useCheckCpf - CPF incompleto:', cleanCpf.length, 'dígitos');
      return false;
    }
    
    try {
      console.log('useCheckCpf - Iniciando verificação para empresa:', company.id);
      const exists = await eleitorService.checkCpfExists(cleanCpf, company.id);
      console.log('useCheckCpf - Resultado da verificação:', exists);
      return exists;
    } catch (error) {
      console.error('useCheckCpf - Erro ao verificar CPF:', error);
      return false;
    }
  }, [cpf, company?.id]);

  const query = useQuery({
    queryKey: ['check-cpf', cpf?.replace(/[^\d]/g, ''), company?.id],
    queryFn: checkCpf,
    enabled: !!cpf && !!company?.id,
    retry: false,
    staleTime: 0, // Desabilita o cache para sempre verificar
    cacheTime: 0, // Não mantém em cache
  });

  console.log('useCheckCpf - Estado da query:', {
    cpf,
    companyId: company?.id,
    isLoading: query.isLoading,
    data: query.data,
    error: query.error
  });

  return {
    cpfExists: query.data,
    isLoading: query.isLoading,
  };
}
