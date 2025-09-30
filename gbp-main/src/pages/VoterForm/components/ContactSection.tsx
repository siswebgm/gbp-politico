import { UseFormRegister, FormState } from 'react-hook-form';
import { Phone, Instagram, Heart, Users, Home, User } from 'lucide-react';
import { FormattedInput } from '../../../components/FormattedInput';
import { EleitorFormData } from '../../../types/eleitor';

interface ContactSectionProps {
  register: UseFormRegister<EleitorFormData>;
  formState: FormState<EleitorFormData>;
}

export function ContactSection({ register, formState }: ContactSectionProps) {
  const { errors } = formState;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Contato
      </h3>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            WhatsApp*
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <FormattedInput
              type="tel"
              mask="(99) 99999-9999"
              name="whatsapp"
              register={register}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="(00) 00000-0000"
            />
          </div>
          {errors.whatsapp && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.whatsapp.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Telefone
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <FormattedInput
              type="tel"
              mask="(99) 99999-9999"
              name="telefone"
              register={register}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="(00) 00000-0000"
            />
          </div>
          {errors.telefone && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.telefone.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Instagram
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Instagram className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              {...register('instagram')}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="@usuario"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Número do SUS
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Heart className="h-5 w-5 text-gray-400" />
            </div>
            <FormattedInput
              type="text"
              mask="999 9999 9999 9999"
              name="numero_do_sus"
              register={register}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="000 0000 0000 0000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Qtd. de Adultos na Residência
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              min="0"
              {...register('quantidade_adultos_residencia')}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Número de adultos"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Responsável pelo Eleitor
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              {...register('responsavel_pelo_eleitor')}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Nome do responsável"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Confiabilidade do Voto
          </label>
          <select
            {...register('confiabilidade_do_voto')}
            className="block w-full pl-3 pr-10 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Selecione</option>
            <option value="ALTO">Alta</option>
            <option value="MEDIO">Média</option>
            <option value="BAIXO">Baixa</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Colégio Eleitoral
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Home className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              {...register('colegio_eleitoral')}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Nome do colégio eleitoral"
            />
          </div>
        </div>
      </div>
    </div>
  );
}