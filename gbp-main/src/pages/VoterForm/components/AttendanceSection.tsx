import React from 'react';
import { UseFormRegister, FormState, UseFormWatch } from 'react-hook-form';
import { EleitorFormData } from '../../../types/eleitor';

interface AttendanceSectionProps {
  register: UseFormRegister<EleitorFormData>;
  formState: FormState<EleitorFormData>;
  watch: UseFormWatch<EleitorFormData>;
}

export function AttendanceSection({ register, formState, watch }: AttendanceSectionProps) {
  const { errors } = formState;
  const registrarAtendimento = watch('registrarAtendimento');

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Atendimento
      </h3>

      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            {...register('registrarAtendimento')}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
          />
          <label className="ml-2 block text-sm text-gray-900 dark:text-white">
            Registrar atendimento
          </label>
        </div>

        {registrarAtendimento && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Descrição do Atendimento
              </label>
              <textarea
                {...register('descricaoAtendimento')}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Descreva o atendimento..."
              />
              {errors.descricaoAtendimento && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {errors.descricaoAtendimento.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Categoria do Atendimento
              </label>
              <select
                {...register('categoriaAtendimento')}
                className="block w-full pl-3 pr-10 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Selecione</option>
                <option value="1">Categoria 1</option>
                <option value="2">Categoria 2</option>
                <option value="3">Categoria 3</option>
              </select>
              {errors.categoriaAtendimento && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {errors.categoriaAtendimento.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status do Atendimento
              </label>
              <select
                {...register('statusAtendimento')}
                className="block w-full pl-3 pr-10 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Selecione</option>
                <option value="PENDENTE">Pendente</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="CONCLUIDO">Concluído</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
              {errors.statusAtendimento && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {errors.statusAtendimento.message}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}