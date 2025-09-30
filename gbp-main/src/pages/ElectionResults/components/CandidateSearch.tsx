import React from 'react';
import { Search } from 'lucide-react';

interface CandidateSearchProps {
  searchTerm: string;
  selectedYear: string;
  onSearchTermChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onSearch: () => void;
  loading: boolean;
}

export function CandidateSearch({
  searchTerm,
  selectedYear,
  onSearchTermChange,
  onYearChange,
  onSearch,
  loading,
}: CandidateSearchProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Nome do Candidato
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value.toUpperCase())}
          className="block w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
          placeholder="Digite o nome do candidato"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Ano da Eleição
        </label>
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(e.target.value)}
          className="block w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="2022">2022</option>
          <option value="2020">2020</option>
          <option value="2018">2018</option>
          <option value="2016">2016</option>
        </select>
      </div>

      <div className="md:col-span-3">
        <button
          onClick={onSearch}
          disabled={loading}
          className="w-full h-11 px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span className="ml-2">Buscando...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Search className="h-5 w-5 mr-2" />
              <span>Buscar Resultados</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}