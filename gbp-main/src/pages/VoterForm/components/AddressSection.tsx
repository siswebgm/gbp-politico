import React, { useEffect } from 'react';
import { UseFormRegister, FormState, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { MapPin } from 'lucide-react';
import { FormattedInput } from '../../../components/FormattedInput';
import { AutocompleteInput } from '../../../components/AutocompleteInput';
import { EleitorFormData } from '../../../types/eleitor';
import { useGeocoding } from '../../../hooks/useGeocoding';
import { useCep } from '../../../hooks/useCep';

interface AddressSectionProps {
  register: UseFormRegister<EleitorFormData>;
  formState: FormState<EleitorFormData>;
  setValue: UseFormSetValue<EleitorFormData>;
  watch: UseFormWatch<EleitorFormData>;
}

export function AddressSection({ register, formState, setValue, watch }: AddressSectionProps) {
  const { errors } = formState;
  const { geocodeAddress } = useGeocoding();
  const { fetchAddress } = useCep();

  const cep = watch('cep');
  const logradouro = watch('logradouro');
  const numero = watch('numero');
  const bairro = watch('bairro');
  const cidade = watch('cidade');

  useEffect(() => {
    const updateCoordinates = async () => {
      if (logradouro && numero && bairro && cidade) {
        const fullAddress = `${logradouro}, ${numero} - ${bairro}, ${cidade}`;
        const result = await geocodeAddress(fullAddress);
        
        if (result) {
          setValue('latitude', result.lat);
          setValue('longitude', result.lng);
        }
      }
    };

    updateCoordinates();
  }, [logradouro, numero, bairro, cidade, setValue, geocodeAddress]);

  const handleCepChange = async (value: string) => {
    setValue('cep', value);
    
    if (value.length === 8) {
      const address = await fetchAddress(value);
      if (address) {
        setValue('logradouro', address.logradouro || '');
        setValue('bairro', address.bairro || '');
        setValue('cidade', address.localidade || '');
        // Foca no campo número após preenchimento automático
        document.querySelector('input[name="numero"]')?.focus();
      }
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Endereço
      </h3>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            CEP*
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <FormattedInput
              type="text"
              mask="99999-999"
              name="cep"
              register={register}
              onChange={handleCepChange}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="00000-000"
            />
          </div>
          {errors.cep && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.cep.message}
            </p>
          )}
        </div>

        <AutocompleteInput
          name="logradouro"
          label="Logradouro"
          required
          placeholder="Rua, Avenida, etc."
          error={errors.logradouro?.message}
          register={register}
          setValue={setValue}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Número*
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              {...register('numero')}
              className="block w-full pl-10 pr-3 py-2 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Número"
            />
          </div>
          {errors.numero && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.numero.message}
            </p>
          )}
        </div>

        <AutocompleteInput
          name="complemento"
          label="Complemento"
          placeholder="Apartamento, sala, etc."
          error={errors.complemento?.message}
          register={register}
          setValue={setValue}
        />

        <AutocompleteInput
          name="bairro"
          label="Bairro"
          required
          placeholder="Bairro"
          error={errors.bairro?.message}
          register={register}
          setValue={setValue}
        />

        <AutocompleteInput
          name="cidade"
          label="Cidade"
          required
          placeholder="Cidade"
          error={errors.cidade?.message}
          register={register}
          setValue={setValue}
        />
      </div>
    </div>
  );
}