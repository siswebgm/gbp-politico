import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const settingsSchema = z.object({
  whatsappEnabled: z.boolean(),
  notificationsEnabled: z.boolean(),
  defaultServiceStatus: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  reportEmailAddress: z.string().email('Email inválido'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export function SettingsForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      whatsappEnabled: true,
      notificationsEnabled: true,
      defaultServiceStatus: 'pending',
      reportEmailAddress: '',
    },
  });

  const onSubmit = async (data: SettingsFormData) => {
    // This will be implemented with actual API integration
    console.log(data);
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">
        Configurações Gerais
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('whatsappEnabled')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Habilitar integração com WhatsApp
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('notificationsEnabled')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Habilitar notificações por email
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status padrão para novos atendimentos
            </label>
            <select
              {...register('defaultServiceStatus')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="pending">Pendente</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Concluído</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email para envio de relatórios
            </label>
            <input
              type="email"
              {...register('reportEmailAddress')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.reportEmailAddress && (
              <p className="mt-1 text-sm text-red-600">
                {errors.reportEmailAddress.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  );
}