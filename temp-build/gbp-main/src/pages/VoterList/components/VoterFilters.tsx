import React from 'react';
import { Search, MapPin, CreditCard } from 'lucide-react';

interface VoterFiltersProps {
  filters: {
    search: string;
    city: string;
    neighborhood: string;
    category: string;
    indication: string;
    logradouro: string;
    cpf: string;
  };
  onFilterChange: (name: string, value: string) => void;
}

export function VoterFilters({ filters, onFilterChange }: VoterFiltersProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Busca geral */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Busca
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className="block w-full pl-10 h-11 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              placeholder="Nome, endereço..."
            />
          </div>
        </div>

        {/* CPF */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            CPF
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <CreditCard className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={filters.cpf}
              onChange={(e) => onFilterChange('cpf', e.target.value)}
              className="block w-full pl-10 h-11 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              placeholder="Filtrar por CPF"
            />
          </div>
        </div>

        {/* Logradouro */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Logradouro
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={filters.logradouro}
              onChange={(e) => onFilterChange('logradouro', e.target.value.toUpperCase())}
              className="block w-full pl-10 h-11 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              placeholder="Filtrar por logradouro"
            />
          </div>
        </div>

        {/* Cidade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cidade
          </label>
          <input
            type="text"
            value={filters.city}
            onChange={(e) => onFilterChange('city', e.target.value.toUpperCase())}
            className="block w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
            placeholder="Filtrar por cidade"
          />
        </div>

        {/* Bairro */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bairro
          </label>
          <input
            type="text"
            value={filters.neighborhood}
            onChange={(e) => onFilterChange('neighborhood', e.target.value.toUpperCase())}
            className="block w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
            placeholder="Filtrar por bairro"
          />
        </div>

        {/* Categoria */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Categoria
          </label>
          <select
            value={filters.category}
            onChange={(e) => onFilterChange('category', e.target.value)}
            className="block w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
          >
            <option value="">Todas as categorias</option>
            <option value="apoiador">Apoiador</option>
            <option value="voluntario">Voluntário</option>
            <option value="lider">Líder Comunitário</option>
          </select>
        </div>

        {/* Indicação */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Indicação
          </label>
          <input
            type="text"
            value={filters.indication}
            onChange={(e) => onFilterChange('indication', e.target.value.toUpperCase())}
            className="block w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
            placeholder="Filtrar por indicação"
          />
        </div>
      </div>
    </div>
  );
}