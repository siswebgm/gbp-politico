import React from 'react';
import { UseFormRegister, FormState, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { EleitorFormData } from '../../../types/eleitor';
import { useCategories } from '../../../hooks/useCategories';

interface CategorySectionProps {
  register: UseFormRegister<EleitorFormData>;
  formState: FormState<EleitorFormData>;
  setValue: UseFormSetValue<EleitorFormData>;
  watch: UseFormWatch<EleitorFormData>;
}

export function CategorySection({ register, formState, setValue, watch }: CategorySectionProps) {
  const { errors } = formState;
  const categoria_uid = watch('categoria_uid');
  const indicado = watch('indicado');
  const { data: categorias, isLoading } = useCategories();

  const handleCategoriaChange = (value: string) => {
    setValue('categoria_uid', value);
  };

  const handleIndicadoChange = (value: string) => {
    setValue('indicado', value);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Categoria e Indicação
      </h3>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Categoria*
          </label>
          <select
            {...register('categoria_uid')}
            className="block w-full pl-3 pr-10 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            disabled={isLoading}
          >
            <option value="">Selecione</option>
            {categorias?.map((categoria) => (
              <option key={categoria.uid} value={categoria.uid}>
                {categoria.nome}
              </option>
            ))}
          </select>
          {errors.categoria_uid && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.categoria_uid.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Indicado por
          </label>
          <input
            type="text"
            {...register('indicado')}
            className="block w-full pl-3 pr-10 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Nome de quem indicou"
          />
          {errors.indicado && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.indicado.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}