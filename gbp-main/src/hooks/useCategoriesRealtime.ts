import { useState, useCallback } from 'react';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useCategories } from './useCategories';

export function useCategoriesRealtime() {
  const { categories, createCategory, deleteCategory } = useCategories();
  const [isRealtime, setIsRealtime] = useState(true);

  useRealtimeSubscription({
    table: 'gbp_categorias',
    onInsert: () => {
      if (isRealtime) {
        categories.refetch();
      }
    },
    onUpdate: () => {
      if (isRealtime) {
        categories.refetch();
      }
    },
    onDelete: () => {
      if (isRealtime) {
        categories.refetch();
      }
    },
  });

  const toggleRealtime = useCallback(() => {
    setIsRealtime(prev => !prev);
  }, []);

  return {
    categories: categories.data || [],
    loading: categories.isLoading,
    error: categories.error as Error | null,
    createCategory,
    deleteCategory,
    isRealtime,
    toggleRealtime,
  };
}