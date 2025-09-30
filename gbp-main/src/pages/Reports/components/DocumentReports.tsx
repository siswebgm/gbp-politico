import React, { useState } from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { generateReport } from '../../../utils/reportGenerator';
import { useDocuments } from '../../../hooks/useDocuments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DocumentType } from '../../../types/document';

const documentTypes: Record<DocumentType, string> = {
  law_project: 'Projeto de Lei',
  office: 'Ofício',
  requirement: 'Requerimento',
};

export function DocumentReports() {
  const [format, setFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [documentType, setDocumentType] = useState<DocumentType | ''>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { documents } = useDocuments();

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const filteredDocuments = documentType
        ? documents.data?.filter(doc => doc.tipo === documentType)
        : documents.data;

      generateReport({
        title: documentType 
          ? `Relatório de ${documentTypes[documentType]}`
          : 'Relatório de Documentos',
        subtitle: `Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
        columns: [
          { header: 'Título', key: 'titulo' },
          { header: 'Tipo', key: 'tipo' },
          { header: 'Status', key: 'status' },
          { header: 'Responsável', key: 'responsavel.nome' },
          { header: 'Data de Criação', key: 'created_at' },
        ],
        data: (filteredDocuments || []).map(doc => ({
          ...doc,
          tipo: documentTypes[doc.tipo],
          created_at: format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        })),
        format,
        orientation: 'landscape',
      });
    } catch (error) {
      console.error('Error generating document report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Relatório de Documentos
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tipo de Documento
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType | '')}
            className="block w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Todos os tipos</option>
            {Object.entries(documentTypes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

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
          disabled={isGenerating || !documents.data?.length}
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