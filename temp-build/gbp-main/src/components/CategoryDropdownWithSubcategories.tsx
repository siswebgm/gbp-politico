import React from 'react';
import { Category } from '../types/category';

interface CategoryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
  isLoading?: boolean;
  className?: string;
  placeholder?: string;
  error?: string;
}

export const CategoryDropdownWithSubcategories: React.FC<CategoryDropdownProps> = ({
  value,
  onChange,
  categories = [],
  isLoading = false,
  className = '',
  placeholder = 'Selecione uma categoria',
  error
}) => {
  // Organizando as categorias em grupos
  const categorizedData = categories.reduce((acc, category) => {
    if (!acc[category.tipo || 'Outros']) {
      acc[category.tipo || 'Outros'] = [];
    }
    acc[category.tipo || 'Outros'].push(category);
    return acc;
  }, {} as Record<string, Category[]>);

  return (
    <div className="w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
        className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} 
          rounded-md shadow-sm focus:outline-none focus:ring-2 
          ${error ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'}
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${className}`}
      >
        <option value="">{isLoading ? 'Carregando...' : placeholder}</option>
        {Object.entries(categorizedData).map(([tipo, categorias]) => (
          <optgroup key={tipo} label={tipo}>
            {categorias.map((categoria) => (
              <option key={categoria.uid} value={categoria.uid}>
                {categoria.nome}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};
