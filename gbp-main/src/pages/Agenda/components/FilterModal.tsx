import React from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { format } from 'date-fns';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    startDate: Date;
    endDate: Date;
    type: string;
    status: string;
  };
  onApplyFilters: (filters: {
    startDate: Date;
    endDate: Date;
    type: string;
    status: string;
  }) => void;
}

export function FilterModal({ isOpen, onClose, filters, onApplyFilters }: FilterModalProps) {
  const [localFilters, setLocalFilters] = React.useState(filters);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters(localFilters);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
              Filtros
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Data Inicial
              </label>
              <input
                type="date"
                value={format(localFilters.startDate, 'yyyy-MM-dd')}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, startDate: new Date(e.target.value) })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Data Final
              </label>
              <input
                type="date"
                value={format(localFilters.endDate, 'yyyy-MM-dd')}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, endDate: new Date(e.target.value) })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo
              </label>
              <select
                value={localFilters.type}
                onChange={(e) => setLocalFilters({ ...localFilters, type: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="REUNIAO">Reunião</option>
                <option value="SERVICO">Serviço</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <select
                value={localFilters.status}
                onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="PENDING">Pendente</option>
                <option value="CONFIRMED">Confirmado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Aplicar Filtros
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
}
