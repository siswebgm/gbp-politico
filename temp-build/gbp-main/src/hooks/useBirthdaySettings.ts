import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { birthdayService } from '../services/birthday';
import { useCompanyStore } from './useCompanyContext';

export function useBirthdaySettings() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useCompanyStore();

  const settings = useQuery({
    queryKey: ['birthday-settings', currentCompanyId],
    queryFn: () => {
      if (!currentCompanyId) {
        throw new Error('Empresa não selecionada');
      }
      return birthdayService.get(currentCompanyId);
    },
    enabled: !!currentCompanyId,
  });

  const updateSettings = useMutation({
    mutationFn: (data: Parameters<typeof birthdayService.update>[1]) => {
      if (!settings.data?.id) {
        if (!currentCompanyId) throw new Error('Empresa não selecionada');
        return birthdayService.create({ ...data, gbp_empresas: currentCompanyId });
      }
      return birthdayService.update(settings.data.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birthday-settings', currentCompanyId] });
    },
  });

  return {
    settings,
    updateSettings,
  };
}