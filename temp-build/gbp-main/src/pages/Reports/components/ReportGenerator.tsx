import React, { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { generateReport } from '../../../utils/reportGenerator';
import { useVoters } from '../../../hooks/useVoters';
import { useAttendances } from '../../../hooks/useAttendances';
import { format } from 'date-fns';

interface ReportGeneratorProps {
  type: 'voters' | 'attendances';
}

export function ReportGenerator({ type }: ReportGeneratorProps) {
  const [format, setFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const { voters } = useVoters();
  const { attendances } = useAttendances();

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      if (type === 'voters') {
        generateReport({
          title: 'Relatório de Eleitores',
          subtitle: 'Lista completa de eleitores cadastrados',
          columns: [
            { header: 'Nome', key: 'nome' },
            { header: 'CPF', key: 'cpf' },
            { header: 'WhatsApp', key: 'whatsapp' },
            { header: 'Cidade', key: 'cidade' },
            { header: 'Bairro', key: 'bairro' },
            { header: 'Categoria', key: 'categoria' },
          ],
          data: voters.data || [],
          format,
          orientation: 'landscape',
        });
      } else {
        generateReport({
          title: 'Relatório de Atendimentos',
          subtitle: 'Histórico de atendimentos realizados',
          columns: [
            { header: 'Data', key: 'data_atendimento' },
            { header: 'Eleitor', key: 'eleitor.nome' },
            { header: 'Descrição', key: 'descricao' },
            { header: 'Categoria', key: 'categoria.nome' },
          ],
          data: attendances.data || [],
          format,
          orientation: 'landscape',
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {type === 'voters' ? 'Relatório de Eleitores' : 'Relatório de Atendimentos'}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Formato do Relatório
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormat('pdf')}
              className={`flex items-center justify-center px-4 py-2 border rounded-lg ${
                format === 'pdf'
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <FileText className="h-5 w-5 mr-2" />
              PDF
            </button>
            <button
              type="button"
              onClick={() => setFormat('xlsx')}
              className={`flex items-center justify-center px-4 py-2 border rounded-lg ${
                format === 'xlsx'
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Excel
            </button>
          </div>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Gerando...
            </>
          ) : (
            'Gerar Relatório'
          )}
        </button>
      </div>
    </div>
  );
}