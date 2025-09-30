import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Tag, User, Calendar } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useCompanyStore } from '../../../hooks/useCompanyContext';
import { documentService } from '../../../services/documents';
import { Modal } from '../../../components/Modal';
import type { DocumentType } from '../../../types/document';

const documentSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  tipo: z.enum(['law_project', 'official_letter', 'requirement', 'minutes', 'resolution', 'ordinance']),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  tags: z.array(z.string()).optional(),
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface DocumentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const documentTypes: Record<DocumentType, string> = {
  law_project: 'Projeto de Lei',
  official_letter: 'Ofício',
  requirement: 'Requerimento',
  minutes: 'Ata',
  resolution: 'Resolução',
  ordinance: 'Portaria'
};

export function DocumentForm({ isOpen, onClose, onSuccess }: DocumentFormProps) {
  const { user } = useAuthStore();
  const { currentCompanyId } = useCompanyStore();
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      tipo: 'law_project',
      tags: [],
    },
  });

  const onSubmit = async (data: DocumentFormData) => {
    try {
      if (!currentCompanyId || !user?.id) {
        throw new Error('Sessão inválida');
      }

      await documentService.create({
        titulo: data.titulo,
        tipo: data.tipo,
        descricao: data.descricao,
        status: 'draft',
        responsavel_id: Number(user.id),
        empresa_id: currentCompanyId,
      });

      reset();
      setError(null);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating document:', error);
      setError(error instanceof Error ? error.message : 'Erro ao criar documento');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Documento">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Título
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              {...register('titulo')}
              className="block w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Título do documento"
            />
          </div>
          {errors.titulo && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.titulo.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tipo de Documento
          </label>
          <select
            {...register('tipo')}
            className="mt-1 block w-full pl-3 pr-10 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            {Object.entries(documentTypes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Descrição
          </label>
          <textarea
            {...register('descricao')}
            rows={4}
            className="mt-1 block w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Descreva o documento..."
          />
          {errors.descricao && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.descricao.message}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
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
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}