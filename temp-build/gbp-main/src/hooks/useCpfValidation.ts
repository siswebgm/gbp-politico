import { useState } from 'react';
import { useCompanyStore } from './useCompanyContext';
import { voterService } from '../services/voters';

export function useCpfValidation() {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { currentCompanyId } = useCompanyStore();

  const validateCpf = async (cpf: string | undefined | null): Promise<boolean> => {
    if (!cpf || !currentCompanyId) return true;

    setIsValidating(true);
    setValidationError(null);

    try {
      const exists = await voterService.checkCpfExists(cpf, currentCompanyId);
      if (exists) {
        setValidationError('CPF já cadastrado no sistema');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error validating CPF:', error);
      setValidationError('Erro ao validar CPF');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  return {
    validateCpf,
    isValidating,
    validationError,
    clearValidationError: () => setValidationError(null),
  };
}