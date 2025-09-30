import React from 'react';
import { categories } from '../data/categories';

interface CategoryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Selecione uma categoria'
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    >
      <option value="">{placeholder}</option>
      {categories.map((category) => (
        <optgroup key={category.id} label={category.nome}>
          {category.subcategorias.map((subcategory) => (
            <option key={subcategory.id} value={subcategory.value}>
              {subcategory.nome}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};
