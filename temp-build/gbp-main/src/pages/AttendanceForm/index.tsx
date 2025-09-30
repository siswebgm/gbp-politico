import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AttendanceFormContent } from './components/AttendanceFormContent';
import { ArrowLeft } from 'lucide-react';

export function AttendanceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eleitorId = searchParams.get('eleitor');
  const isEditing = Boolean(id);

  const handleBack = () => {
    if (eleitorId) {
      navigate(`/app/eleitores/${eleitorId}`);
    } else {
      navigate('/app/atendimentos');
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="w-full px-2 sm:px-4 py-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBack}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {isEditing ? 'Editar Atendimento' : 'Novo Atendimento'}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {isEditing
                    ? 'Atualize as informações do atendimento'
                    : 'Registre um novo atendimento'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full px-2 sm:px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-3 sm:p-4">
              <AttendanceFormContent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}