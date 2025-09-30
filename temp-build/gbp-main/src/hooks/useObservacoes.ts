import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { observacaoService } from '../services/observacaoService';
import { ObservacaoFormData } from '../types/observacao';

export function useObservacoes(atendimento_uid: string) {
  const queryClient = useQueryClient();

  const { data: observacoes = [], isLoading } = useQuery({
    queryKey: ['observacoes', atendimento_uid],
    queryFn: () => observacaoService.list(atendimento_uid),
    enabled: !!atendimento_uid
  });

  const { mutateAsync: createObservacao, isLoading: isCreating } = useMutation({
    mutationFn: (data: ObservacaoFormData) => observacaoService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observacoes', atendimento_uid] });
    }
  });

  return {
    observacoes,
    isLoading,
    createObservacao,
    isCreating
  };
}
