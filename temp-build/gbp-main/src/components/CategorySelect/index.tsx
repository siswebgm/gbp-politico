import React, { useState } from 'react';
import { Plus, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';
import { CategoryModal } from './CategoryModal';

interface CategorySelectProps {
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
}

export function CategorySelect({ value, onChange, error }: CategorySelectProps) {
  const [showModal, setShowModal] = useState(false);
  const { data: categorias, isLoading, error: categoriesError } = useCategories();
  const categoriesList = categorias || [];

  const handleSuccess = (categoryId: number) => {
    onChange(categoryId);
    setShowModal(false);
  };

  if (isLoading) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Categoria
        </label>
        <div className="animate-pulse h-11 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Carregando categorias...</span>
        </div>
      </div>
    );
  }

  if (categoriesError) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Categoria
        </label>
        <div className="text-sm text-red-600 dark:text-red-400 flex items-center p-2 bg-red-50 dark:bg-red-900/50 rounded-lg">
          <AlertCircle className="h-4 w-4 mr-2" />
          Erro ao carregar categorias. Tente novamente.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Categoria
        </label>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 transition-colors duration-200"
        >
          <Plus className="h-4 w-4 inline-block mr-1" />
          Nova Categoria
        </button>
      </div>

      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          className="block w-full h-11 pl-4 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white appearance-none transition-colors duration-200"
          disabled={isLoading}
        >
          <option value="">Selecione uma categoria</option>
          {categoriesList.map((category) => (
            <option key={category.id} value={category.id}>
              {category.nome}
              {category.descricao && ` - ${category.descricao}`}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <CategoryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}