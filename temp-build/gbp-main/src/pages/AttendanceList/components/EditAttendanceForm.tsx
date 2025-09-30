import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { updateAttendance } from '../../../services/attendances/update';
import { useToast } from '../../../hooks/useToast';
import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../../../lib/supabase';

const attendanceSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  data_atendimento: z.string(),
});

type AttendanceFormData = z.infer<typeof attendanceSchema>;

export function EditAttendanceForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const company = useCompanyStore((state) => state.company);
  const { showToast } = useToast();

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['attendance', id],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('gbp_atendimentos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!company,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      descricao: attendance?.descricao || '',
      status: attendance?.status || 'pending',
      data_atendimento: attendance?.data_atendimento || new Date().toISOString(),
    },
  });

  const onSubmit = async (data: AttendanceFormData) => {
    if (!id || !company) return;

    try {
      await updateAttendance(Number(id), data, company.id);
      showToast({
        title: 'Sucesso',
        description: 'Atendimento atualizado com sucesso',
        type: 'success',
      });
      navigate('/atendimentos');
    } catch (error) {
      showToast({
        title: 'Erro',
        description: 'Erro ao atualizar atendimento',
        type: 'error',
      });
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Carregando...</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label
          htmlFor="descricao"
          className="block text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          Descrição
        </label>
        <textarea
          id="descricao"
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
          {...register('descricao')}
        />
        {errors.descricao && (
          <p className="mt-1 text-sm text-red-600">{errors.descricao.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          Status
        </label>
        <select
          id="status"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
          {...register('status')}
        >
          <option value="pending">Pendente</option>
          <option value="in_progress">Em Andamento</option>
          <option value="completed">Concluído</option>
          <option value="cancelled">Cancelado</option>
        </select>
        {errors.status && (
          <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="data_atendimento"
          className="block text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          Data do Atendimento
        </label>
        <input
          type="datetime-local"
          id="data_atendimento"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
          {...register('data_atendimento')}
        />
        {errors.data_atendimento && (
          <p className="mt-1 text-sm text-red-600">{errors.data_atendimento.message}</p>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => navigate('/atendimentos')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
