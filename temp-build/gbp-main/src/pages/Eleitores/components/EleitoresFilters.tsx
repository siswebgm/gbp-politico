import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { EleitorFilters } from '../../../types/eleitor';
import { useDebounce } from '../../../hooks/useDebounce';

interface EleitoresFiltersProps {
  filters: EleitorFilters;
  onFilterChange: (filters: EleitorFilters) => void;
}

export function EleitoresFilters({
  filters,
  onFilterChange,
}: EleitoresFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.nome || '');
  const debouncedSearch = useDebounce(searchValue, 500);

  useEffect(() => {
    const currentNome = filters.nome;
    if (currentNome !== debouncedSearch) {
      onFilterChange({ ...filters, nome: debouncedSearch });
    }
  }, [debouncedSearch, onFilterChange]);

  return (
    <div className="relative px-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-primary-500"
          placeholder="Buscar por nome, CPF ou WhatsApp..."
        />
      </div>
    </div>
  );
}
