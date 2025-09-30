import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEleitores } from '../../../hooks/useEleitores';
import { useIndicados } from '../../../hooks/useIndicados';
import { useQuery } from 'react-query';
import { eleitorService } from '../../../services/eleitorService';
import { EleitorFormData } from '../../../types/eleitor';
import { ArrowLeft } from 'lucide-react';

const eleitorSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cpf: z.string().min(11, 'CPF inválido').max(14, 'CPF inválido'),
  data_nascimento: z.string().min(1, 'Data de nascimento é obrigatória'),
  whatsapp: z.string().min(1, 'WhatsApp é obrigatório'),
  titulo_eleitor: z.string().min(1, 'Título de eleitor é obrigatório'),
  telefone: z.string().optional(),
  genero: z.enum(['MASCULINO', 'FEMININO', 'OUTRO']).optional(),
  zona: z.string().optional(),
  secao: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  cidade: z.string().optional(),
  bairro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  categoria_id: z.string().optional(),
  indicacao: z.string().optional(),
});

export function NovoEleitor() {
  const navigate = useNavigate();
  const { createEleitor } = useEleitores({});
  const { data: indicados, isLoading: isLoadingIndicados } = useIndicados();
  const [cpfError, setCpfError] = useState<string | null>(null);
  const company = { id: 1 }; // Substituir com o ID da empresa
  
  const { register, watch, setValue, handleSubmit, formState: { errors, isSubmitting } } = useForm<EleitorFormData>({
    resolver: zodResolver(eleitorSchema)
  });

  const cpf = watch('cpf');
  const { data: cpfExists, isLoading: isCheckingCpf } = useQuery({
    queryKey: ['check-cpf', cpf?.replace(/[^\d]/g, '')],
    queryFn: async () => {
      if (!cpf) return false;
      const cleanCpf = cpf.replace(/[^\d]/g, '');
      if (cleanCpf.length !== 11) return false;
      return eleitorService.checkCpfExists(cleanCpf, company.id);
    },
    enabled: !!cpf,
    retry: false,
    staleTime: 0,
  });

  // Formatar CPF enquanto digita
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
    if (value.length <= 11) {
      // Formata o CPF (###.###.###-##)
      if (value.length >= 9) {
        value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
      } else if (value.length >= 6) {
        value = value.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
      } else if (value.length >= 3) {
        value = value.replace(/(\d{3})(\d{0,3})/, '$1.$2');
      }
      setValue('cpf', value);
    }
  };

  // Verificar CPF duplicado em tempo real
  useEffect(() => {
    if (cpfExists) {
      setCpfError('CPF já cadastrado');
    } else {
      setCpfError(null);
    }
  }, [cpfExists]);

  const onSubmit = async (data: EleitorFormData) => {
    try {
      if (cpfExists) {
        setCpfError('CPF já cadastrado');
        return;
      }

      await createEleitor(data);
      navigate('/eleitores');
    } catch (error) {
      console.error('Erro ao criar eleitor:', error);
    }
  };

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
          Novo Eleitor
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl">
        {/* Dados Pessoais */}
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
              Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  CPF*
                </label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('cpf')}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {isCheckingCpf && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                    </div>
                  )}
                </div>
                {(errors.cpf || cpfError) && (
                  <p className="mt-1 text-sm text-red-600">{errors.cpf?.message || cpfError}</p>
                )}
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nome*
                </label>
                <input
                  type="text"
                  {...register('nome')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                {errors.nome && (
                  <p className="mt-1 text-sm text-red-600">{errors.nome.message}</p>
                )}
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Data de Nascimento*
                </label>
                <input
                  type="date"
                  {...register('data_nascimento')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                {errors.data_nascimento && (
                  <p className="mt-1 text-sm text-red-600">{errors.data_nascimento.message}</p>
                )}
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Gênero
                </label>
                <select
                  {...register('genero')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Selecione...</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMININO">Feminino</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
              Contato
            </h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  WhatsApp*
                </label>
                <input
                  type="text"
                  {...register('whatsapp')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                {errors.whatsapp && (
                  <p className="mt-1 text-sm text-red-600">{errors.whatsapp.message}</p>
                )}
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Telefone
                </label>
                <input
                  type="text"
                  {...register('telefone')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
              Endereço
            </h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  CEP
                </label>
                <input
                  type="text"
                  {...register('cep')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Logradouro
                </label>
                <input
                  type="text"
                  {...register('logradouro')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cidade
                </label>
                <input
                  type="text"
                  {...register('cidade')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bairro
                </label>
                <input
                  type="text"
                  {...register('bairro')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Número
                </label>
                <input
                  type="text"
                  {...register('numero')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Complemento
                </label>
                <input
                  type="text"
                  {...register('complemento')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Informações Eleitorais */}
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
              Informações Eleitorais
            </h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Título de Eleitor*
                </label>
                <input
                  type="text"
                  {...register('titulo_eleitor')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                {errors.titulo_eleitor && (
                  <p className="mt-1 text-sm text-red-600">{errors.titulo_eleitor.message}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Zona
                </label>
                <input
                  type="text"
                  {...register('zona')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Seção
                </label>
                <input
                  type="text"
                  {...register('secao')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Relacionamentos */}
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
              Relacionamentos
            </h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Categoria
                </label>
                <select
                  {...register('categoria_id')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Selecione...</option>
                  {/* TODO: Adicionar categorias do banco */}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Indicado por
                </label>
                <select
                  {...register('indicacao')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isLoadingIndicados}
                >
                  <option value="">Selecione um indicado...</option>
                  {indicados && indicados.map((indicado) => (
                    <option key={indicado.id} value={indicado.id}>
                      {indicado.nome}
                    </option>
                  ))}
                </select>
                {isLoadingIndicados ? (
                  <p className="mt-1 text-sm text-gray-500">Carregando indicados...</p>
                ) : indicados?.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">Nenhum indicado encontrado</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/eleitores')}
            className="mr-3 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
