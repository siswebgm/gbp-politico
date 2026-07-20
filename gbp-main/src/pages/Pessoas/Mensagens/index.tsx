import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Send } from 'lucide-react';
import { useEleitores } from '../../../hooks/useEleitores';
import { EleitorFilters } from '../../../types/eleitor';

interface MensagemForm extends EleitorFilters {
  mensagem: string;
}

export function MensagensEleitores() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<MensagemForm>();
  const [previewCount, setPreviewCount] = React.useState(0);
  const { eleitores, sendWhatsAppMessage } = useEleitores({});

  const onSubmit = async (data: MensagemForm) => {
    try {
      const { mensagem, ...filters } = data;
      await sendWhatsAppMessage(mensagem, filters);
    } catch (error) {
      console.error('Erro ao enviar mensagens:', error);
    }
  };

  // Atualiza a contagem de destinatários com base nos filtros
  const updatePreviewCount = React.useCallback((filters: EleitorFilters) => {
    if (eleitores) {
      const count = eleitores.filter(eleitor => {
        if (filters.nome && !eleitor.nome.toLowerCase().includes(filters.nome.toLowerCase())) return false;
        if (filters.bairro && !eleitor.bairro?.toLowerCase().includes(filters.bairro.toLowerCase())) return false;
        if (filters.genero && eleitor.genero !== filters.genero) return false;
        if (filters.zona && eleitor.zona !== filters.zona) return false;
        if (filters.categoria_id && eleitor.categoria_id !== filters.categoria_id) return false;
        return true;
      }).length;
      setPreviewCount(count);
    }
  }, [eleitores]);

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/eleitores')}
          className="mr-4 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Enviar Mensagens
        </h1>
      </div>

      <div className="max-w-4xl">
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Filtros */}
              <div className="mb-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
                  Filtrar Destinatários
                </h3>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nome
                    </label>
                    <input
                      type="text"
                      {...register('nome')}
                      onChange={(e) => updatePreviewCount({ nome: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Filtrar por nome..."
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Bairro
                    </label>
                    <input
                      type="text"
                      {...register('bairro')}
                      onChange={(e) => updatePreviewCount({ bairro: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Filtrar por bairro..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Gênero
                    </label>
                    <select
                      {...register('genero')}
                      onChange={(e) => updatePreviewCount({ genero: e.target.value as any })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">Todos</option>
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMININO">Feminino</option>
                      <option value="OUTRO">Outro</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Zona Eleitoral
                    </label>
                    <input
                      type="text"
                      {...register('zona')}
                      onChange={(e) => updatePreviewCount({ zona: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Filtrar por zona..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Categoria
                    </label>
                    <select
                      {...register('categoria_id')}
                      onChange={(e) => updatePreviewCount({ categoria_id: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">Todas</option>
                      {/* TODO: Adicionar categorias do banco */}
                    </select>
                  </div>
                </div>
              </div>

              {/* Preview de destinatários */}
              <div className="mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Esta mensagem será enviada para <strong>{previewCount}</strong> eleitores
                  </p>
                </div>
              </div>

              {/* Mensagem */}
              <div className="mb-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
                  Mensagem
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Texto da mensagem
                  </label>
                  <textarea
                    rows={4}
                    {...register('mensagem', { required: 'Mensagem é obrigatória' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Digite sua mensagem..."
                  />
                  {errors.mensagem && (
                    <p className="mt-1 text-sm text-red-600">{errors.mensagem.message}</p>
                  )}
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/eleitores')}
                  className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || previewCount === 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5 mr-2" />
                  {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
