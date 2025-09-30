import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, FileText, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { Voter } from '../../../types/voter';

interface VoterTableProps {
  voters: Voter[];
  loading: boolean;
  error: Error | null;
  filters: {
    search: string;
    city: string;
    neighborhood: string;
    category: string;
    indication: string;
    logradouro: string;
    cpf: string;
  };
}

const ITEMS_PER_PAGE = 10;

export function VoterTable({ voters, loading, error, filters }: VoterTableProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este eleitor?')) {
      try {
        await deleteVoter.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting voter:', error);
        alert('Erro ao excluir eleitor');
      }
    }
  };

  const handleViewProfile = (id: number) => {
    navigate(`/app/voters/${id}/profile`);
  };

  const handleEdit = (id: number) => {
    navigate(`/app/voters/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300">Carregando eleitores...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Erro ao carregar eleitores: {error.message}
      </div>
    );
  }

  const filteredVoters = voters.filter((voter) => {
    const searchLower = filters.search.toLowerCase();
    const matchesSearch =
      !filters.search ||
      voter.nome?.toLowerCase().includes(searchLower) ||
      voter.cpf?.includes(filters.search);

    const matchesCity = !filters.city || voter.cidade?.toLowerCase() === filters.city.toLowerCase();
    const matchesNeighborhood =
      !filters.neighborhood || voter.bairro?.toLowerCase() === filters.neighborhood.toLowerCase();
    const matchesCategory = !filters.category || voter.categoria === filters.category;
    const matchesIndication = !filters.indication || voter.indicacao === filters.indication;
    const matchesLogradouro =
      !filters.logradouro || voter.logradouro?.toLowerCase() === filters.logradouro.toLowerCase();
    const matchesCpf = !filters.cpf || voter.cpf?.includes(filters.cpf);

    return (
      matchesSearch &&
      matchesCity &&
      matchesNeighborhood &&
      matchesCategory &&
      matchesIndication &&
      matchesLogradouro &&
      matchesCpf
    );
  });

  const totalPages = Math.ceil(filteredVoters.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedVoters = filteredVoters.slice(startIndex, endIndex);

  if (filteredVoters.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Nenhum eleitor encontrado com os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto w-full">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="w-10 p-4">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Nome
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                CPF
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                WhatsApp
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Bairro
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Cidade
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedVoters.map((voter) => (
              <tr 
                key={voter.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 ease-in-out"
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{voter.nome}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-300">{voter.cpf}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-300">{voter.whatsapp}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-300">{voter.bairro}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-300">{voter.cidade}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleViewProfile(voter.id)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(voter.id)}
                      className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(voter.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Mostrando <span className="font-medium">{startIndex + 1}</span> até{' '}
            <span className="font-medium">
              {Math.min(startIndex + ITEMS_PER_PAGE, filteredVoters.length)}
            </span>{' '}
            de <span className="font-medium">{filteredVoters.length}</span> resultados
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Página <span className="font-medium">{currentPage}</span> de{' '}
            <span className="font-medium">{totalPages}</span>
          </span>

          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}