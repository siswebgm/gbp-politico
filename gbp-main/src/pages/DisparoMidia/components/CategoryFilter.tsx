import { useEffect } from 'react';
import { useCategories } from '../../../hooks/useCategories';

interface FilterOption {
  id: string;
  label: string;
  value: string;
  type: 'cidade' | 'bairro' | 'categoria' | 'genero';
}

interface CategoryFilterProps {
  onCategoriesChange: (categories: FilterOption[]) => void;
  disabled?: boolean;
}

export function CategoryFilter({ onCategoriesChange, disabled }: CategoryFilterProps) {
  const { data: categoriasData, isLoading: isLoadingCategorias } = useCategories();

  useEffect(() => {
    if (categoriasData) {
      // Converter para o formato FilterOption
      const categoriasFormatted: FilterOption[] = categoriasData.map(cat => ({
        id: cat.uid,
        value: cat.uid,
        label: cat.nome,
        type: 'categoria'
      }));

      onCategoriesChange(categoriasFormatted);
    }
  }, [categoriasData, onCategoriesChange]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Categoria
      </label>
      <select
        className="block w-full pl-3 pr-10 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        disabled={disabled || isLoadingCategorias}
      >
        <option value="">Selecione uma categoria...</option>
        {categoriasData?.map((categoria) => (
          <option key={categoria.uid} value={categoria.uid}>
            {categoria.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
