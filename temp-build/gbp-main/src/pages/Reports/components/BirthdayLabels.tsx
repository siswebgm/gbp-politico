import React, { useState } from 'react';
import { Tag, Calendar } from 'lucide-react';
import { useVoters } from '../../../hooks/useVoters';
import { generateBirthdayLabels } from '../../../utils/labelGenerator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function BirthdayLabels() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isGenerating, setIsGenerating] = useState(false);
  const { voters } = useVoters();

  const handleGenerateLabels = async () => {
    setIsGenerating(true);
    try {
      generateBirthdayLabels(voters.data || [], selectedMonth);
    } catch (error) {
      console.error('Error generating labels:', error);
      alert('Erro ao gerar etiquetas. Por favor, tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: format(new Date(2024, i), 'MMMM', { locale: ptBR }),
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <Tag className="h-5 w-5 text-gray-400 mr-2" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Etiquetas de Aniversário
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Mês de Aniversário
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="block w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerateLabels}
          disabled={isGenerating || !voters.data?.length}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Gerando Etiquetas...
            </>
          ) : (
            'Gerar Etiquetas'
          )}
        </button>

        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Gera etiquetas no formato Carta (30 etiquetas por página)
          <br />
          Dimensões: 25,4 mm x 66,7 mm
        </p>
      </div>
    </div>
  );
}