import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { voterService } from '../services/voters';
import { useCompanyStore } from './useCompanyContext';
import type { Database } from '../types/supabase';

type VoterInsert = Database['public']['Tables']['gbp_eleitores']['Insert'];

interface Filters {
  search?: string;
  city?: string;
  neighborhood?: string;
  category?: string;
  indication?: string;
  logradouro?: string;
  cpf?: string;
}

export function useVoters(filters?: Filters) {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useCompanyStore();

  const voters = useQuery({
    queryKey: ['voters', currentCompanyId, filters],
    queryFn: () => {
      if (!currentCompanyId) {
        throw new Error('No company selected');
      }
      return voterService.list(currentCompanyId, filters);
    },
    enabled: !!currentCompanyId,
  });

  const createVoter = useMutation({
    mutationFn: async (data: VoterInsert) => {
      if (!currentCompanyId) {
        throw new Error('No company selected');
      }
      
      // Check if CPF already exists for this company
      if (data.cpf) {
        const cpfExists = await voterService.checkCpfExists(data.cpf, currentCompanyId);
        if (cpfExists) {
          throw new Error('CPF já cadastrado');
        }
      }
      return voterService.create({ ...data, empresa_id: currentCompanyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voters', currentCompanyId] });
    },
  });

  const updateVoter = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VoterInsert> }) => {
      if (!currentCompanyId) {
        throw new Error('No company selected');
      }

      // Check if CPF is being changed and already exists
      if (data.cpf) {
        const currentVoter = voters.data?.find(v => v.id === id);
        if (currentVoter?.cpf !== data.cpf) {
          const cpfExists = await voterService.checkCpfExists(data.cpf, currentCompanyId);
          if (cpfExists) {
            throw new Error('CPF já cadastrado');
          }
        }
      }

      return voterService.update(id, { ...data, empresa_id: currentCompanyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voters', currentCompanyId] });
    },
  });

  const deleteVoter = useMutation({
    mutationFn: (id: string) => {
      if (!currentCompanyId) {
        throw new Error('No company selected');
      }
      return voterService.delete(id, currentCompanyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voters', currentCompanyId] });
    },
  });

  return {
    voters,
    createVoter,
    updateVoter,
    deleteVoter,
  };
}