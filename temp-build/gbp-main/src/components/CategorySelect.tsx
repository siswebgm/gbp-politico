import React from 'react';
import { useCategories } from '../hooks/useCategories';

interface CategorySelectProps {
  value?: number;
  onChange: (value: number | null) => void;
  error?: string;
}

export function CategorySelect({ value, onChange, error }: CategorySelectProps) {
  const { data: categories, isLoading } = useCategories();

  if (isLoading) {
    return (
      <div className="w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 animate-pulse" />
    );
  }

  return (
    <div>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Selecione uma categoria</option>
        {categories?.map((category) => (
          <option key={category.id} value={category.id}>
            {category.nome}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}