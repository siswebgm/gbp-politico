import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { useCompanyStore } from '../../../hooks/useCompanyContext';
import { voterService } from '../../../services/voters';
import { formatCpf } from '../../../utils/formatters'; 

const cpfSchema = z.object({
  cpf: z.string().optional(),
  ignoreCpf: z.boolean().default(false),
}).refine(data => data.ignoreCpf || (data.cpf && data.cpf.length >= 11), {
  message: 'CPF é obrigatório quando não marcado como indisponível',
  path: ['cpf']
});

type CpfFormData = z.infer<typeof cpfSchema>;

interface CpfVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CpfVerificationModal({ isOpen, onClose }: CpfVerificationModalProps) {
  const navigate = useNavigate();
  const { currentCompanyId } = useCompanyStore();
  const [error, setError] = useState<string | null>(null);
  const [cpfValue, setCpfValue] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CpfFormData>({
    resolver: zodResolver(cpfSchema),
    defaultValues: {
      ignoreCpf: false,
      cpf: '',
    },
  });

  const ignoreCpf = watch('ignoreCpf');
  
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const formattedValue = formatCpf(rawValue);
    setCpfValue(formattedValue);
    setValue('cpf', formattedValue);
  };

  const handleIgnoreCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('ignoreCpf', e.target.checked);
    if (e.target.checked) {
      setCpfValue(''); 
      setValue('cpf', ''); 
      setError(null);
    }
  };

  const onSubmit = async (data: CpfFormData) => {
    if (!currentCompanyId) {
      setError('Empresa não selecionada');
      return;
    }

    try {
      setError(null);

      if (ignoreCpf) {
        navigate('/app/voters/new');
        return;
      }

      const cleanCpf = data.cpf?.replace(/\D/g, '');
      if (!cleanCpf) {
        setError('CPF é obrigatório');
        return;
      }
      const voter = await voterService.findByCpf(cleanCpf, currentCompanyId);

      if (voter) {
        // Voter exists - redirect to profile
        onClose();
        navigate(`/app/voters/${voter.id}/profile`);
      } else {
        onClose();
        // Voter doesn't exist - redirect to new voter form
        navigate('/app/voters/new', { 
          state: { cpf: cleanCpf }
        });
      }

    } catch (error) {
      console.error('Error verifying CPF:', error);
      setError('Erro ao verificar CPF. Por favor, tente novamente.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Verificar CPF">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              CPF do Eleitor
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                {...register('cpf')}
                value={cpfValue}
                onChange={handleCpfChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="000.000.000-00"
                disabled={ignoreCpf}
                maxLength={14}
              />
            </div>
            {errors.cpf && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errors.cpf.message}
              </p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('ignoreCpf')}
              id="ignoreCpf"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              onChange={(e) => {
                handleIgnoreCpfChange(e);
                register('ignoreCpf').onChange(e);
              }}
            />
            <label
              htmlFor="ignoreCpf"
              className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
            >
              CPF não disponível
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Verificando...
              </>
            ) : (
              'Continuar'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}