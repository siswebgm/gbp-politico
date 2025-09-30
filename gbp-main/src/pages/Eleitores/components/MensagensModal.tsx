import { useState } from 'react';
import { X } from 'lucide-react';
import { useEleitores } from '../../../hooks/useEleitores';

interface MensagensModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MensagensModal({ isOpen, onClose }: MensagensModalProps) {
  const [mensagem, setMensagem] = useState('');
  const [filtros, setFiltros] = useState({
    bairro: '',
    zona: '',
    secao: '',
    categoria: ''
  });

  const { sendMessage } = useEleitores({});

  const handleSendMessage = async () => {
    try {
      await sendMessage({ mensagem, filtros });
      onClose();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30"></div>
        
        <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Enviar Mensagens
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Filtros */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Filtrar Destinatários
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={filtros.bairro}
                    onChange={(e) => setFiltros({ ...filtros, bairro: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Categoria
                  </label>
                  <select
                    value={filtros.categoria}
                    onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Todas</option>
                    <option value="apoiador">Apoiador</option>
                    <option value="simpatizante">Simpatizante</option>
                    <option value="neutro">Neutro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Zona
                  </label>
                  <input
                    type="text"
                    value={filtros.zona}
                    onChange={(e) => setFiltros({ ...filtros, zona: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Seção
                  </label>
                  <input
                    type="text"
                    value={filtros.secao}
                    onChange={(e) => setFiltros({ ...filtros, secao: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Mensagem */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mensagem
              </label>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="Digite sua mensagem aqui..."
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Você pode usar {'{nome}'} para incluir o nome do eleitor na mensagem.
              </p>
            </div>

            {/* Preview */}
            {mensagem && (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preview
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {mensagem.replace('{nome}', 'João da Silva')}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendMessage}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
