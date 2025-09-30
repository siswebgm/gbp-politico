import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Category } from '../types/category';

interface NestedCategoryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
  isLoading?: boolean;
  className?: string;
  placeholder?: string;
  error?: string;
}

export const NestedCategoryDropdown: React.FC<NestedCategoryDropdownProps> = ({
  value,
  onChange,
  categories = [],
  isLoading = false,
  className = '',
  placeholder = 'Selecione uma categoria',
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Organizando as categorias por tipo
  const categorizedData = categories.reduce((acc, category) => {
    const tipo = category.tipo?.nome || 'Outros';
    if (!acc[tipo]) {
      acc[tipo] = [];
    }
    acc[tipo].push(category);
    return acc;
  }, {} as Record<string, Category[]>);

  // Encontra o nome da categoria selecionada
  const selectedCategory = categories.find(cat => cat.uid === value);

  // Fecha o dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSelect = (category: Category) => {
    onChange(category.uid);
    setIsOpen(false);
  };

  const renderDropdown = () => {
    if (!isOpen) return null;

    return (
      <>
        {/* Backdrop para evitar interações com elementos abaixo */}
        <div 
          className="fixed inset-0 bg-transparent"
          style={{ zIndex: 40 }}
          onClick={() => setIsOpen(false)}
        />
        
        {/* Dropdown */}
        <div
          className="absolute bg-white border border-gray-200 rounded-md shadow-lg overflow-y-auto"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            maxHeight: '300px',
            marginBottom: '4px',
            zIndex: 9999
          }}
        >
          {Object.entries(categorizedData).map(([tipo, categorias]) => (
            <div key={tipo} className="border-b border-gray-200 last:border-0">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-700/80 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
                onClick={() => toggleCategory(tipo)}
              >
                <div className="flex items-center space-x-2">
                  {openCategories.includes(tipo) ? (
                    <ChevronDown className="h-4 w-4 text-blue-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-blue-500" />
                  )}
                  <span className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wide">{tipo}</span>
                </div>
              </div>

              {openCategories.includes(tipo) && (
                <div className="bg-white dark:bg-gray-800 py-1">
                  {categorias.map((category) => (
                    <div
                      key={category.uid}
                      className={`pl-10 pr-4 py-2 cursor-pointer border-l-2 ${
                        value === category.uid 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 font-medium' 
                          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                      onClick={() => handleSelect(category)}
                    >
                      <span className={`text-gray-700 dark:text-gray-300 ${value === category.uid ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                        {category.nome}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-left text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500 ${className}`}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
            <span>Carregando...</span>
          </div>
        ) : (
          <span className={selectedCategory ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
            {selectedCategory ? selectedCategory.nome : placeholder}
          </span>
        )}
      </button>

      {error && <span className="text-red-500 text-sm">{error}</span>}

      {renderDropdown()}
    </div>
  );
};
