import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Filter, Plus } from 'lucide-react';
import { VoterTable } from './components/VoterTable';
import { VoterFilters } from './components/VoterFilters';
import { CpfVerificationModal } from './components/CpfVerificationModal';
import { useCompanyStore } from '../../hooks/useCompanyContext';
import { useVotersRealtime } from '../../hooks/useVotersRealtime';
import { exportVotersToExcel } from '../../utils/excelExport';

export function VoterList() {
  const navigate = useNavigate();
  const { currentCompanyId } = useCompanyStore();
  const [showFilters, setShowFilters] = useState(false);
  const [showCpfModal, setShowCpfModal] = useState(false);
  const [filters, setFilters] = React.useState({
    search: '',
    city: '',
    neighborhood: '',
    category: '',
    indication: '',
    logradouro: '',
    cpf: '',
  });

  const { voters, loading, error } = useVotersRealtime();

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewVoter = () => {
    setShowCpfModal(true);
  };

  const handleExportExcel = () => {
    if (voters.length > 0) {
      exportVotersToExcel(voters, filters);
    }
  };

  if (!currentCompanyId) {
    return (
      <div className="text-center text-gray-500">
        Selecione uma empresa para visualizar os eleitores.
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-800 shadow">
        <div className="p-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Eleitores</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gerencie o cadastro de eleitores
          </p>
        </div>
        <div className="flex flex-wrap gap-2 p-4">
          <button
            onClick={handleExportExcel}
            disabled={voters.length === 0 || loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            <Download className="h-4 w-4 mr-2" />
            <span>Exportar Excel</span>
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            <Filter className="h-4 w-4 mr-2" />
            <span>{showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}</span>
          </button>
          <button
            onClick={handleNewVoter}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span>Novo Eleitor</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-gray-800 shadow transition-all duration-300 ease-in-out">
          <div className="p-4">
            <VoterFilters filters={filters} onFilterChange={handleFilterChange} />
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow">
        <VoterTable 
          voters={voters}
          loading={loading}
          error={error}
          filters={filters} 
        />
      </div>

      <CpfVerificationModal
        isOpen={showCpfModal}
        onClose={() => setShowCpfModal(false)}
        onVerified={(cpf) => {
          setShowCpfModal(false);
          navigate('/app/voters/novo', { state: { cpf } });
        }}
      />
    </div>
  );
}