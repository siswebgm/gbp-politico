import { useQuery } from '@tanstack/react-query';
import { getFilterOptions, getResults, getStats } from '../../services/election';
import type { ElectionFilters } from '../../types/election';

export function useElectionData(filters: ElectionFilters, currentPage: number) {
  const filterOptions = useQuery({
    queryKey: ['election-filter-options'],
    queryFn: getFilterOptions,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const results = useQuery({
    queryKey: ['election-results', filters, currentPage],
    queryFn: () => getResults(filters, currentPage),
    keepPreviousData: true,
  });

  const stats = useQuery({
    queryKey: ['election-stats', filters],
    queryFn: () => getStats(filters),
  });

  return {
    filterOptions,
    results,
    stats,
    isLoading: filterOptions.isLoading || results.isLoading || stats.isLoading,
    error: filterOptions.error || results.error || stats.error,
  };
}