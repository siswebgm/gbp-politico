import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    status: string;
    categoria: string;
    dataInicio: string;
    dataFim: string;
  };
  onFilterChange: (filters: {
    status: string;
    categoria: string;
    dataInicio: string;
    dataFim: string;
  }) => void;
  categorias: { nome: string }[];
}

export function FilterModal({ isOpen, onClose, filters, onFilterChange, categorias }: FilterModalProps) {
  const statusOptions = ['Pendente', 'Em Andamento', 'Concluído', 'Cancelado'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full rounded-lg bg-white dark:bg-gray-800 shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              Filtrar Atendimentos
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Status
                </label>
                <select
                  id="status"
                  value={filters.status}
                  onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Todos</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Categoria
                </label>
                <select
                  id="categoria"
                  value={filters.categoria}
                  onChange={(e) => onFilterChange({ ...filters, categoria: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Todas</option>
                  {categorias.map((cat) => (
                    <option key={cat.nome} value={cat.nome}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Data Início
                  </label>
                  <input
                    type="date"
                    id="dataInicio"
                    value={filters.dataInicio}
                    onChange={(e) => onFilterChange({ ...filters, dataInicio: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 text-sm text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    id="dataFim"
                    value={filters.dataFim}
                    onChange={(e) => onFilterChange({ ...filters, dataFim: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  onFilterChange({
                    status: '',
                    categoria: '',
                    dataInicio: '',
                    dataFim: ''
                  });
                  onClose();
                }}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Limpar
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Aplicar
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
