import React from 'react';
import { Filter } from 'lucide-react';
import type { ElectionFilters as ElectionFiltersType } from '../../../types/election';

interface ElectionFiltersProps {
  filters: ElectionFiltersType;
  onFilterChange: (name: keyof ElectionFiltersType, value: string | number | undefined) => void;
}

export function ElectionFilters({ filters, onFilterChange }: ElectionFiltersProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex items-center mb-4">
        <Filter className="h-5 w-5 text-gray-400 mr-2" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Filtros da Votação
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* UF */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            UF
          </label>
          <select
            value={filters.sg_uf || ''}
            onChange={(e) => onFilterChange('sg_uf', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white h-11 px-4"
          >
            <option value="">Todas</option>
            <option value="PE">PE</option>
          </select>
        </div>

        {/* Município */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Município
          </label>
          <select
            value={filters.nm_municipio || ''}
            onChange={(e) => onFilterChange('nm_municipio', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white h-11 px-4"
          >
            <option value="">Todos</option>
            <option value="PAULISTA">PAULISTA</option>
          </select>
        </div>

        {/* Zona */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Zona
          </label>
          <input
            type="number"
            value={filters.nr_zona || ''}
            onChange={(e) => onFilterChange('nr_zona', e.target.value ? Number(e.target.value) : undefined)}
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white h-11 px-4"
            placeholder="Digite a zona"
          />
        </div>

        {/* Local de Votação */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Local de Votação
          </label>
          <input
            type="text"
            value={filters.nm_local_votacao || ''}
            onChange={(e) => onFilterChange('nm_local_votacao', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white h-11 px-4"
            placeholder="Digite o local de votação"
          />
        </div>

        {/* Cargo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cargo
          </label>
          <select
            value={filters.ds_cargo || ''}
            onChange={(e) => onFilterChange('ds_cargo', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white h-11 px-4"
          >
            <option value="">Todos</option>
            <option value="VEREADOR">VEREADOR</option>
          </select>
        </div>

        {/* Número do Candidato */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Número do Candidato
          </label>
          <input
            type="number"
            value={filters.nr_votavel || ''}
            onChange={(e) => onFilterChange('nr_votavel', e.target.value ? Number(e.target.value) : undefined)}
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white h-11 px-4"
            placeholder="Digite o número"
          />
        </div>

        {/* Nome do Candidato */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nome do Candidato
          </label>
          <input
            type="text"
            value={filters.nm_votavel || ''}
            onChange={(e) => onFilterChange('nm_votavel', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white h-11 px-4"
            placeholder="Digite o nome"
          />
        </div>
      </div>
    </div>
  );
}