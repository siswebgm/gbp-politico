import React from 'react';
import { Search, Filter } from 'lucide-react';

interface UserFiltersProps {
  filters: {
    search: string;
    role: string;
    status: string;
  };
  onFilterChange: (name: string, value: string) => void;
}

export function UserFilters({ filters, onFilterChange }: UserFiltersProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Buscar
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className="block w-full pl-10 h-11 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Nome ou email..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Função
          </label>
          <select
            value={filters.role}
            onChange={(e) => onFilterChange('role', e.target.value)}
            className="block w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todas as funções</option>
            <option value="admin">Administrador</option>
            <option value="attendant">Atendente</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="block w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="blocked">Bloqueado</option>
          </select>
        </div>
      </div>
    </div>
  );
}