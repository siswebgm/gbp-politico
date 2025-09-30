import React, { useState, useEffect } from 'react';
import { useCompanyStore } from '../../../../store/useCompanyStore';
import { supabaseClient } from '../../../../lib/supabase';
import { Upload, X, FileText } from 'lucide-react';

interface TemplateConfigProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function TemplateConfig({ onClose, onSuccess }: TemplateConfigProps) {
  const company = useCompanyStore((state) => state.company);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentTemplate = async () => {
      if (!company?.uid) return;

      try {
        const { data, error } = await supabaseClient
          .from('gbp_empresas')
          .select('template_oficio_url')
          .eq('uid', company.uid)
          .single();

        if (error) throw error;
        setCurrentTemplate(data?.template_oficio_url || null);
      } catch (error) {
        console.error('Erro ao buscar template:', error);
      }
    };

    fetchCurrentTemplate();
  }, [company?.uid]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.docx')) {
      setError('O arquivo deve ser um documento Word (.docx)');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) { // 5MB
      setError('O arquivo deve ter no máximo 5MB');
      return;
    }

    setFile(selectedFile);
    setError('');
  };

  const handleUpload = async () => {
    if (!file || !company?.uid) return;

    setIsUploading(true);
    setError('');

    try {
      // Upload do arquivo
      const fileName = `template-${Date.now()}.docx`;
      const filePath = `${company.uid}/templates/${fileName}`;

      const { error: uploadError, data: uploadData } = await supabaseClient.storage
        .from('office_templates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Atualizar a URL do template na empresa
      const { error: updateError } = await supabaseClient
        .from('gbp_empresas')
        .update({
          template_oficio_url: uploadData.path,
        })
        .eq('uid', company.uid);

      if (updateError) throw updateError;

      onSuccess();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      setError('Erro ao fazer upload do template. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Modelo de Ofício
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Faça upload do seu modelo de ofício em formato Word (.docx). 
              Este modelo será usado como base para todos os ofícios gerados.
            </p>
          </div>

          {currentTemplate && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Modelo atual:
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {currentTemplate.split('/').pop()}
              </p>
            </div>
          )}

          <div
            className={`border-2 border-dashed rounded-lg p-6 ${
              error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } relative`}
          >
            <div className="flex flex-col items-center">
              <Upload className="h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                Arraste seu modelo de ofício aqui ou clique para selecionar
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Formato aceito: .docx (máx. 5MB)
              </p>
              <input
                type="file"
                accept=".docx"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          )}

          {file && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {file.name}
                </span>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                !file || isUploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {isUploading ? 'Enviando...' : 'Salvar Modelo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
