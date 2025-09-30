import React from 'react';
import { UseFormRegister, FormState, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { FileText, MapPin } from 'lucide-react';
import { FormattedInput } from '../../../components/FormattedInput';
import { formatTituloEleitor, formatZona, formatSecao } from '../../../utils/formatters';
import { EleitorFormData } from '../../../types/eleitor';

interface ElectoralSectionProps {
  register: UseFormRegister<EleitorFormData>;
  formState: FormState<EleitorFormData>;
  setValue: UseFormSetValue<EleitorFormData>;
  watch: UseFormWatch<EleitorFormData>;
}

export function ElectoralSection({ register, formState, setValue, watch }: ElectoralSectionProps) {
  const { errors } = formState;
  const titulo = watch('titulo');
  const zona = watch('zona');
  const secao = watch('secao');

  const handleTituloChange = (value: string) => {
    setValue('titulo', value);
  };

  const handleZonaChange = (value: string) => {
    setValue('zona', value);
  };

  const handleSecaoChange = (value: string) => {
    setValue('secao', value);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Informações Eleitorais
      </h3>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Título de Eleitor
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="h-5 w-5 text-gray-400" />
            </div>
            <FormattedInput
              type="text"
              mask="9999 9999 9999"
              name="titulo"
              register={register}
              value={titulo || ''}
              onChange={handleTituloChange}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="0000 0000 0000"
            />
          </div>
          {errors.titulo && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.titulo.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Zona
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <FormattedInput
              type="text"
              mask="999"
              name="zona"
              register={register}
              value={zona || ''}
              onChange={handleZonaChange}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="000"
            />
          </div>
          {errors.zona && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.zona.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Seção
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <FormattedInput
              type="text"
              mask="9999"
              name="secao"
              register={register}
              value={secao || ''}
              onChange={handleSecaoChange}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="0000"
            />
          </div>
          {errors.secao && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.secao.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}