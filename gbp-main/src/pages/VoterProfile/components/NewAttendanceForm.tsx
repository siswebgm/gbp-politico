import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAttendances } from '../../../hooks/useAttendances';
import { useAuthStore } from '../../../store/useAuthStore';

const attendanceSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  categoria_id: z.number().nullable(),
});

type AttendanceFormData = z.infer<typeof attendanceSchema>;

interface NewAttendanceFormProps {
  voterId: number;
  onSuccess?: () => void;
}

export function NewAttendanceForm({ voterId, onSuccess }: NewAttendanceFormProps) {
  const { user } = useAuthStore();
  const { createAttendance } = useAttendances(voterId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      categoria_id: null,
    },
  });

  const onSubmit = async (data: AttendanceFormData) => {
    try {
      await createAttendance.mutateAsync({
        ...data,
        eleitor_id: voterId,
        usuario_id: 1, // Temporary: Replace with actual user ID from auth
        data_atendimento: new Date().toISOString(),
      });
      
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating attendance:', error);
      alert('Erro ao registrar atendimento');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Descrição
        </label>
        <textarea
          {...register('descricao')}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Descreva o atendimento..."
        />
        {errors.descricao && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.descricao.message}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Registrando...' : 'Registrar Atendimento'}
        </button>
      </div>
    </form>
  );
}