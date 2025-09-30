import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit2, Trash2 } from 'lucide-react';
import { useAttendances } from '../../../hooks/useAttendances';
import { useCompanyStore } from '../../../hooks/useCompanyContext';
import { EditAttendanceModal } from './EditAttendanceModal';
import { Attendance } from '../../../types/attendance';

interface AttendanceHistoryProps {
  voterId: number;
}

export function AttendanceHistory({ voterId }: AttendanceHistoryProps) {
  const { currentCompanyId } = useCompanyStore();
  const { attendances, deleteAttendance, updateAttendance } = useAttendances(voterId);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleDelete = async (id: number) => {
    if (!currentCompanyId) return;
    
    if (window.confirm('Tem certeza que deseja excluir este atendimento?')) {
      try {
        await deleteAttendance.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting attendance:', error);
        alert('Erro ao excluir atendimento');
      }
    }
  };

  const handleEdit = (attendance: Attendance) => {
    setSelectedAttendance(attendance);
    setIsEditModalOpen(true);
  };

  const handleSave = async (data: any) => {
    if (!selectedAttendance || !currentCompanyId) return;

    try {
      await updateAttendance.mutateAsync({
        id: selectedAttendance.id,
        updates: {
          categoria_id: data.categoria_id,
          descricao: data.descricao,
          data_atendimento: data.data_atendimento,
        },
        companyId: currentCompanyId,
      });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Erro ao atualizar atendimento');
    }
  };

  if (attendances.isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (attendances.isError) {
    return (
      <div className="text-center text-red-600 dark:text-red-400 p-4">
        Erro ao carregar atendimentos
      </div>
    );
  }

  if (!attendances.data?.length) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 p-4">
        Nenhum atendimento registrado
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Data
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Atendente
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Categoria
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Descrição
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {attendances.data.map((attendance) => (
            <tr key={attendance.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {format(new Date(attendance.data_atendimento), "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {attendance.usuario?.nome || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {attendance.categoria?.nome || '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                {attendance.descricao}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleEdit(attendance)}
                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 dark:text-blue-400 dark:hover:text-blue-300 rounded-full transition-colors duration-200 group relative"
                    title="Editar atendimento"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs py-1 px-2 rounded -top-8 -left-4 whitespace-nowrap">
                      Editar atendimento
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(attendance.id)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900 dark:text-red-400 dark:hover:text-red-300 rounded-full transition-colors duration-200 group relative"
                    title="Excluir atendimento"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs py-1 px-2 rounded -top-8 -left-4 whitespace-nowrap">
                      Excluir atendimento
                    </span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedAttendance && (
        <EditAttendanceModal
          attendance={selectedAttendance}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedAttendance(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}