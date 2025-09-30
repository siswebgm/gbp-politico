import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ElectionResult } from '../../../types/election';

interface ResultsTableProps {
  results: ElectionResult[];
}

export function ResultsTable({ results }: ResultsTableProps) {
  if (!results.length) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Nenhum resultado encontrado com os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Local de Votação
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Zona
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Candidato
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Votos
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Data
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {results.map((result) => (
            <tr key={result.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {result.nm_local_votacao || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {result.nr_zona || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {result.nm_votavel || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {result.qt_votos?.toLocaleString() || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {result.dt_eleicao ? format(new Date(result.dt_eleicao), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}