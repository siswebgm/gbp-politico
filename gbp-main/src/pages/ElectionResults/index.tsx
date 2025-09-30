import { useState } from 'react';
import { ElectionFilters } from './components/ElectionFilters';
import { ElectionStats } from './components/ElectionStats';
import { ResultsTable } from './components/ResultsTable';
import { Pagination } from './components/Pagination';
import { useElectionData } from './hooks/useElectionData';
import type { ElectionFilters as ElectionFiltersType } from '../../types/election';

export default function ElectionResults() {
  const [filters, setFilters] = useState<ElectionFiltersType>({});
  const [currentPage, setCurrentPage] = useState(1);

  const { filterOptions, results, stats, isLoading, error } = useElectionData(filters, currentPage);

  const handleFilterChange = (name: keyof ElectionFiltersType, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/50 p-4 rounded-lg text-red-700 dark:text-red-200">
        Erro ao carregar dados. Por favor, tente novamente.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Resultados Eleitorais
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Consulte os resultados das eleições 2024 - Vereador - Paulista/PE
        </p>
      </div>

      {!isLoading && stats?.data && <ElectionStats stats={stats.data} />}

      {filterOptions.data && (
        <ElectionFilters 
          filters={filters} 
          onFilterChange={handleFilterChange} 
        />
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            <ResultsTable results={results?.data?.data || []} />
            {results?.data && results.data.total > 0 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalItems={results.data.total}
                  pageSize={10}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}