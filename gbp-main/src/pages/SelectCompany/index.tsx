import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';

export function SelectCompany() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Building2 className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Selecione uma empresa
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Selecione uma empresa para visualizar o dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="relative w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <Building2 className="h-5 w-5 mr-2" />
              Empresa Teste
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}