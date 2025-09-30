import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Info } from 'lucide-react';
import { DocumentCards } from './components/DocumentCards';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useAuth } from '../../providers/AuthProvider';

export function Documents() {
  const navigate = useNavigate();
  const company = useCompanyStore((state) => state.company);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
  }, [isAuthenticated, navigate]);

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="animate-pulse space-y-4">
            <div className="h-12 w-12 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Selecione uma empresa</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                É necessário selecionar uma empresa para visualizar os documentos.
              </p>
              <div className="pt-4">
                <button
                  onClick={() => navigate('/app/empresas')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Selecionar Empresa
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 py-2 md:py-6 px-2 md:px-4">
        <div className="flex flex-col space-y-2 md:space-y-4">
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate('/app/dashboard')} 
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                aria-label="Voltar para Dashboard"
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-500 dark:text-gray-400" />
              </button>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                Documentos
              </h1>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            <DocumentCards />
          </div>
        </div>
      </div>
    </div>
  );
}