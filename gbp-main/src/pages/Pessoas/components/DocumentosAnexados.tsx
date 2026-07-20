import React from 'react';
import { FileText } from 'lucide-react';

interface DocumentosAnexadosProps {
  ax_rg_cnh: string | null;
  ax_cpf: string | null;
  ax_cert_nascimento: string | null;
  ax_titulo: string | null;
  ax_comp_residencia: string | null;
  ax_foto_3x4: string | null;
}

export const DocumentosAnexados: React.FC<DocumentosAnexadosProps> = ({
  ax_rg_cnh,
  ax_cpf,
  ax_cert_nascimento,
  ax_titulo,
  ax_comp_residencia,
  ax_foto_3x4
}) => {
  // Verifica se há algum documento anexado
  const hasDocuments = ax_rg_cnh || ax_cpf || ax_cert_nascimento || 
    ax_titulo || ax_comp_residencia || ax_foto_3x4;

  if (!hasDocuments) return null;

  return (
    <div className="bg-white shadow sm:rounded-lg mb-6">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentos Anexados
        </h3>
      </div>
      <div className="border-t border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ax_rg_cnh && (
              <a 
                href={ax_rg_cnh}
                target="_blank"
                rel="noopener noreferrer" 
                className="flex items-center p-3 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <FileText className="h-5 w-5 mr-2" />
                RG/CNH
              </a>
            )}
            {ax_cpf && (
              <a 
                href={ax_cpf}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-3 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <FileText className="h-5 w-5 mr-2" />
                CPF
              </a>
            )}
            {ax_cert_nascimento && (
              <a 
                href={ax_cert_nascimento}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-3 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <FileText className="h-5 w-5 mr-2" />
                Certidão de Nascimento
              </a>
            )}
            {ax_titulo && (
              <a 
                href={ax_titulo}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-3 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <FileText className="h-5 w-5 mr-2" />
                Título de Eleitor
              </a>
            )}
            {ax_comp_residencia && (
              <a 
                href={ax_comp_residencia}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-3 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <FileText className="h-5 w-5 mr-2" />
                Comprovante de Residência
              </a>
            )}
            {ax_foto_3x4 && (
              <a 
                href={ax_foto_3x4}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-3 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <FileText className="h-5 w-5 mr-2" />
                Foto 3x4
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
