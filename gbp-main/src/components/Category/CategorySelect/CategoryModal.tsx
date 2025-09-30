import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tag, Loader2, AlertCircle, X } from 'lucide-react';
import { Modal } from '../Modal';
import { useCategories } from '../../hooks/useCategories';
import { useCompanyStore } from '../../hooks/useCompanyContext';

const categorySchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (categoryUid: string) => void;
}

export function CategoryModal({ isOpen, onClose, onSuccess }: CategoryModalProps) {
  const { createCategory } = useCategories();
  const { company } = useCompanyStore();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  const onSubmit = async (data: CategoryFormData) => {
    try {
      setError(null);
      
      if (!company?.uid) {
        throw new Error('Empresa não selecionada');
      }
      const newCategory = await createCategory.mutateAsync({
        nome: data.nome.toUpperCase(),
        descricao: data.descricao || null,
        empresa_uid: company.uid,
      });
      
      reset();
      onSuccess(newCategory.uid);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao criar categoria');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Categoria" size="md">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 p-4 rounded-lg shadow-sm flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nome
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Tag className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              {...register('nome')}
              className="block w-full pl-10 pr-3 h-11 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200"
              placeholder="Nome da categoria"
              autoComplete="off"
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
            Descrição (opcional)
          </label>
          <textarea
            {...register('descricao')}
            rows={3}
            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200 resize-none"
            placeholder="Descrição da categoria"
          />
        </div>

        <div className="mt-8 flex justify-end items-center space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="inline-flex items-center h-11 px-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors duration-200"
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