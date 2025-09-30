import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../../components/Modal';
import { useAttendances } from '../../../hooks/useAttendances';
import { useAuthStore } from '../../../store/useAuthStore';
import { useCategories } from '../../../hooks/useCategories';
import { useCompanyStore } from '../../../hooks/useCompanyContext';

const attendanceSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  categoria_id: z.string().optional(),
});

type AttendanceFormData = z.infer<typeof attendanceSchema>;

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  voterId: number;
}

export function AttendanceModal({ isOpen, onClose, voterId }: AttendanceModalProps) {
  const { user } = useAuthStore();
  const { currentCompanyId } = useCompanyStore();
  const { createAttendance } = useAttendances(voterId);
  const { categories } = useCategories();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
  });

  const onSubmit = async (data: AttendanceFormData) => {
    try {
      if (!currentCompanyId) {
        throw new Error('Empresa não selecionada');
      }

      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      await createAttendance.mutateAsync({
        eleitor_id: voterId,
        usuario_id: Number(user.id),
        categoria_id: data.categoria_id ? Number(data.categoria_id) : null,
        descricao: data.descricao.toUpperCase(),
        data_atendimento: new Date().toISOString(),
        empresa_id: currentCompanyId,
      });
      
      reset();
      setError(null);
      onClose();
    } catch (error) {
      console.error('Error creating attendance:', error);
      setError(error instanceof Error ? error.message : 'Erro ao registrar atendimento');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Atendimento">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Categoria
          </label>
          <select
            {...register('categoria_id')}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Selecione uma categoria</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.nome}
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
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="Descreva o atendimento..."
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
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}