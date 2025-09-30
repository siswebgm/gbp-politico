import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Modal } from '../Modal';
import { useCompanyStore } from '../../hooks/useCompanyContext';
import { indicadoService } from '../../services/indicados';

const indicadoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cidade: z.string().optional(),
  bairro: z.string().optional(),
});

type IndicadoFormData = z.infer<typeof indicadoSchema>;

interface IndicadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (indicadoId: number) => void;
}

export function IndicadoModal({ isOpen, onClose, onSuccess }: IndicadoModalProps) {
  const { currentCompanyId } = useCompanyStore();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IndicadoFormData>({
    resolver: zodResolver(indicadoSchema),
  });

  const onSubmit = async (data: IndicadoFormData) => {
    if (!currentCompanyId) {
      setError('Empresa não selecionada');
      return;
    }

    try {
      setError(null);

      const newIndicado = await indicadoService.create({
        ...data,
        gbp_empresas: currentCompanyId,
      });

      reset();
      onSuccess(newIndicado.id);
    } catch (error) {
      console.error('Error creating indicado:', error);
      setError('Erro ao criar indicado. Por favor, tente novamente.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Indicado">
      <div className="space-y-6 px-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nome
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              {...register('nome')}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200"
              placeholder="Nome completo"
            />
          </div>
          {errors.nome && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.nome.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Cidade
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              {...register('cidade')}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200"
              placeholder="Cidade"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Bairro
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              {...register('bairro')}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200"
              placeholder="Bairro"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors duration-200"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}