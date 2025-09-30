import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Download, Info, AlertCircle } from 'lucide-react';
import { useEleitores } from '../../../hooks/useEleitores';
import { EleitorFilters } from '../../../types/eleitor';
import { useAuth } from '../../../providers/AuthProvider';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { CargoEnum } from '../../../services/auth';
import { hasRestrictedAccess } from '../../../constants/accessLevels';

export function ExportarEleitores() {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm<EleitorFilters>();
  const { exportEleitores } = useEleitores({});
  const { user } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const isAdmin = user?.cargo === CargoEnum.ADMIN;
  const canAccess = isAdmin && hasRestrictedAccess(user?.nivel_acesso);

  const onSubmit = async (filters: EleitorFilters) => {
    if (!canAccess) {
      return;
    }
    
    try {
      await exportEleitores(filters);
    } catch (error) {
      console.error('Erro ao exportar eleitores:', error);
    }
  };

  return (
    <div className="p-6">
      {/* Banner de Permissões */}
      <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4 dark:bg-blue-900/20 dark:border-blue-800">
        <div className="flex">
          <div className="flex-shrink-0">
            {canAccess ? (
              <Info className="h-5 w-5 text-blue-400" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            )}
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Informações de Acesso
            </h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              <p className="mb-1">
                <strong>Permissões necessárias:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cargo: Administrador {isAdmin ? '✓' : '✗'}</li>
                <li>Nível de Acesso: Diferente de 'comum' {user?.nivel_acesso !== 'comum' ? '✓' : '✗'}</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                <p className="mb-1"><strong>Dados do Usuário:</strong></p>
                <p>Nome: {user?.nome}</p>
                <p>Cargo: {user?.cargo}</p>
                <p>Nível de Acesso: {user?.nivel_acesso}</p>
                <p>Email: {user?.email}</p>
                <p>Empresa: {company?.nome} (ID: {company?.uid})</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/eleitores')}
          className="mr-4 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Exportar Eleitores
        </h1>
      </div>

      <div className="max-w-4xl">
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
              Filtros para Exportação
            </h3>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome
                  </label>
                  <input
                    type="text"
                    {...register('nome')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Buscar por nome..."
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    CPF
                  </label>
                  <input
                    type="text"
                    {...register('cpf')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Buscar por CPF..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Gênero
                  </label>
                  <select
                    {...register('genero')}
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
                    Bairro
                  </label>
                  <input
                    type="text"
                    {...register('bairro')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Buscar por bairro..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Categoria
                  </label>
                  <select
                    {...register('categoria_id')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Todas</option>
                    {/* TODO: Adicionar categorias do banco */}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Zona Eleitoral
                  </label>
                  <input
                    type="text"
                    {...register('zona')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Buscar por zona..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Seção Eleitoral
                  </label>
                  <input
                    type="text"
                    {...register('secao')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Buscar por seção..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Exportar XLSX
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
