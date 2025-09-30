import React from 'react';
import { UseFormRegister, FormState, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { User, CreditCard, Calendar } from 'lucide-react';
import { FormattedInput } from '../../../components/FormattedInput';
import { useCpfValidation } from '../../../hooks/useCpfValidation';
import { useCheckCpf } from '../../../hooks/useCheckCpf';
import { EleitorFormData } from '../../../types/eleitor';

interface PersonalInfoSectionProps {
  register: UseFormRegister<EleitorFormData>;
  formState: FormState<EleitorFormData>;
  setValue: UseFormSetValue<EleitorFormData>;
  watch: UseFormWatch<EleitorFormData>;
  isEditing?: boolean;
}

export function PersonalInfoSection({ register, formState, setValue, watch, isEditing }: PersonalInfoSectionProps) {
  const { errors } = formState;
  const { validateCpf, isValidating: isValidatingFormat, validationError: formatError, clearValidationError } = useCpfValidation();
  const cpf = watch('cpf');
  const ignoreCpf = watch('ignoreCpf');

  // Verifica se o CPF já existe
  const { cpfExists, isLoading: isCheckingDuplicate } = useCheckCpf(cpf);
  const isValidating = isValidatingFormat || isCheckingDuplicate;
  const validationError = formatError || (cpfExists ? 'CPF já cadastrado' : undefined);

  React.useEffect(() => {
    if (!isEditing && cpf && !ignoreCpf) {
      const timer = setTimeout(() => {
        validateCpf(cpf);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [cpf, isEditing, ignoreCpf, validateCpf]);

  const handleCpfChange = (value: string) => {
    setValue('cpf', value);
  };

  const handleIgnoreCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('ignoreCpf', e.target.checked);
    if (e.target.checked) {
      setValue('cpf', '');
      clearValidationError();
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Informações Pessoais
      </h3>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nome*
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              {...register('nome')}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Nome completo"
            />
          </div>
          {errors.nome && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.nome.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              CPF{!ignoreCpf && !isEditing ? '*' : ''}
            </label>
            {!isEditing && (
              <label className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                <input
                  type="checkbox"
                  {...register('ignoreCpf')}
                  onChange={handleIgnoreCpfChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2">CPF não disponível</span>
              </label>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <CreditCard className="h-5 w-5 text-gray-400" />
            </div>
            <FormattedInput
              type="text"
              mask="999.999.999-99"
              name="cpf"
              register={register}
              value={cpf || ''}
              onChange={handleCpfChange}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="000.000.000-00"
              disabled={ignoreCpf || isValidating}
            />
            {isValidating && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
              </div>
            )}
          </div>
          {errors.cpf && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.cpf.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Data de Nascimento
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              {...register('nascimento')}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          {errors.nascimento && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.nascimento.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Gênero*
          </label>
          <select
            {...register('genero')}
            className="block w-full pl-3 pr-10 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Selecione</option>
            <option value="MASCULINO">Masculino</option>
            <option value="FEMININO">Feminino</option>
            <option value="OUTRO">Outro</option>
          </select>
          {errors.genero && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.genero.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}