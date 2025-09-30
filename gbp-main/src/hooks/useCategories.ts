import { useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryService, type CategoryWithType, checkCategoryHasVoters } from '../services/categories';
import { useCompanyStore } from '../store/useCompanyStore';
import { useEffect } from 'react';
import { supabaseClient } from '../lib/supabase';

export function useCategories(tipo?: string) {
  const queryClient = useQueryClient();
  const company = useCompanyStore((state) => state.company);

  const query = useQuery<CategoryWithType[]>({
    queryKey: ['categorias', company?.uid, tipo],
    queryFn: async () => {
      if (!company?.uid) return [];
      const categorias = await categoryService.list(company.uid);
      if (tipo) {
        return categorias.filter(cat => cat.tipo?.uid === tipo);
      }
      return categorias;
    },
    enabled: !!company?.uid,
  });

  useEffect(() => {
    if (!company?.uid) return;

    console.log('Configurando subscription para categorias');
    const subscription = supabaseClient
      .channel('categorias-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gbp_categorias',
          filter: `empresa_uid=eq.${company.uid}`
        },
        (payload) => {
          console.log('Mudança detectada em categorias:', payload);
          queryClient.invalidateQueries({ queryKey: ['categorias', company.uid] });
        }
      )
      .subscribe();

    return () => {
      console.log('Removendo subscription de categorias');
      subscription.unsubscribe();
    };
  }, [company?.uid, queryClient]);

  return {
    ...query,
    createCategory: categoryService.create,
    updateCategory: categoryService.update,
    deleteCategory: categoryService.delete,
    checkCategoryHasVoters,
    refetch: query.refetch
  };
}