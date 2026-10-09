import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompanyStore } from '../store/useCompanyStore';
import { CategoriaGrupo, categoriaGrupoService } from '../services/categories';

export function useCategoriaGrupos() {
  const company = useCompanyStore((state) => state.company);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<CategoriaGrupo[]>({
    queryKey: ['categoria-grupos', company?.uid],
    queryFn: async () => {
      if (!company?.uid) {
        return [];
      }
      return categoriaGrupoService.list(company.uid);
    },
    enabled: !!company?.uid,
  });

  const createGrupo = useMutation({
    mutationFn: async (nome: string) => {
      if (!company?.uid) throw new Error('Empresa não selecionada');
      return categoriaGrupoService.create({ nome, empresa_uid: company.uid });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categoria-grupos', company?.uid] });
    },
  });

  const updateGrupo = useMutation({
    mutationFn: async ({ uid, nome }: { uid: string; nome: string }) => {
      return categoriaGrupoService.update(uid, { nome });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categoria-grupos', company?.uid] });
    },
  });

  const deleteGrupo = useMutation({
    mutationFn: async (uid: string) => {
      return categoriaGrupoService.delete(uid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categoria-grupos', company?.uid] });
      // Tipos vinculados ficam sem grupo (ON DELETE SET NULL)
      queryClient.invalidateQueries({ queryKey: ['categoria-tipos', company?.uid] });
      queryClient.invalidateQueries({ queryKey: ['categorias', company?.uid] });
    },
  });

  return {
    grupos: data || [],
    isLoading,
    error,
    createGrupo: createGrupo.mutateAsync,
    updateGrupo: updateGrupo.mutateAsync,
    deleteGrupo: deleteGrupo.mutateAsync,
    refetch
  };
}
