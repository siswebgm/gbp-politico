import React from 'react';
import { useCompanyStore } from '../../../store/useCompanyStore';

interface DocumentFiltersProps {
  filters: {
    type: string;
    status: string;
    dateRange: string;
    author: string;
  };
  onFilterChange: (name: string, value: string) => void;
}

const documentTypes = [
  { value: '', label: 'Todos os tipos' },
  { value: 'law_project', label: 'Projeto de Lei' },
  { value: 'office', label: 'Ofício' },
  { value: 'requirement', label: 'Requerimento' },
];

const documentStatus = [
  { value: '', label: 'Todos os status' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'review', label: 'Em Revisão' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'rejected', label: 'Rejeitado' },
  { value: 'archived', label: 'Arquivado' },
];

const dateRanges = [
  { value: '', label: 'Todas as datas' },
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mês' },
  { value: 'year', label: 'Este ano' },
];

export function DocumentFilters({ filters, onFilterChange }: DocumentFiltersProps) {
  const company = useCompanyStore((state) => state.company);

  if (!company) return null;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tipo
          </label>
          <select
            id="type"
            name="type"
            value={filters.type}
            onChange={(e) => onFilterChange('type', e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            {documentStatus.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Período
          </label>
          <select
            id="dateRange"
            name="dateRange"
            value={filters.dateRange}
            onChange={(e) => onFilterChange('dateRange', e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            {dateRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="author" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Autor
          </label>
          <input
            type="text"
            id="author"
            name="author"
            value={filters.author}
            onChange={(e) => onFilterChange('author', e.target.value)}
            placeholder="Nome do autor"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
        </div>
      </div>
    </div>
  );
}