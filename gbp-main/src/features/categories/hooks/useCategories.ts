import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { categoryService, categoryTypeService, type Category, type CategoryType, type CategoryWithType } from '../services/categoryService';

export function useCategories() {
  const company = useCompanyStore((state) => state.company);
  const queryClient = useQueryClient();

  const { data: categories, isLoading: isLoadingCategories, error: categoriesError } = useQuery<CategoryWithType[]>({
    queryKey: ['categories', company?.uid],
    queryFn: () => {
      if (!company?.uid) {
        throw new Error('Empresa não selecionada');
      }
      return categoryService.list(company.uid);
    },
    enabled: !!company?.uid,
  });

  const { data: types, isLoading: isLoadingTypes, error: typesError } = useQuery<CategoryType[]>({
    queryKey: ['category-types', company?.uid],
    queryFn: () => {
      if (!company?.uid) {
        throw new Error('Empresa não selecionada');
      }
      return categoryTypeService.list(company.uid);
    },
    enabled: !!company?.uid,
  });

  return {
    categories: categories || [],
    types: types || [],
    isLoading: isLoadingCategories || isLoadingTypes,
    error: categoriesError || typesError,
    
    createCategory: async (category: Omit<Category, 'uid' | 'created_at'>) => {
      if (!company?.uid) {
        throw new Error('Empresa não selecionada');
      }

      const data = await categoryService.create(category);
      await queryClient.invalidateQueries({ queryKey: ['categories', company.uid] });
      return data;
    },

    updateCategory: async ({ uid, ...updates }: { uid: string } & Partial<Omit<Category, 'uid' | 'created_at'>>) => {
      if (!company?.uid) {
        throw new Error('Empresa não selecionada');
      }

      const data = await categoryService.update(uid, updates);
      await queryClient.invalidateQueries({ queryKey: ['categories', company.uid] });
      return data;
    },

    deleteCategory: async (uid: string) => {
      if (!company?.uid) {
        throw new Error('Empresa não selecionada');
      }

      await categoryService.delete(uid);
      await queryClient.invalidateQueries({ queryKey: ['categories', company.uid] });
    },

    createType: async (type: Omit<CategoryType, 'uid' | 'created_at'>) => {
      if (!company?.uid) {
        throw new Error('Empresa não selecionada');
      }

      const data = await categoryTypeService.create(type);
      await queryClient.invalidateQueries({ queryKey: ['category-types', company.uid] });
      return data;
    },

    updateType: async ({ uid, ...updates }: { uid: string } & Partial<Omit<CategoryType, 'uid' | 'created_at'>>) => {
      if (!company?.uid) {
        throw new Error('Empresa não selecionada');
      }

      const data = await categoryTypeService.update(uid, updates);
      await queryClient.invalidateQueries({ queryKey: ['category-types', company.uid] });
      return data;
    },

    deleteType: async (uid: string) => {
      if (!company?.uid) {
        throw new Error('Empresa não selecionada');
      }

      await categoryTypeService.delete(uid);
      await queryClient.invalidateQueries({ queryKey: ['category-types', company.uid] });
    }
  };
}
