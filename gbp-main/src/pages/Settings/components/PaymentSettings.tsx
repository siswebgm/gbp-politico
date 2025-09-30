import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, QrCode } from 'lucide-react';
import { asaasService } from '../../../services/asaas';
import { useCompanyStore } from '../../../hooks/useCompanyContext';

const paymentSchema = z.object({
  cpfCnpj: z.string().min(11, 'CPF/CNPJ inválido'),
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().min(10, 'Telefone inválido'),
  value: z.number().min(1, 'Valor deve ser maior que zero'),
  dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  description: z.string().min(1, 'Descrição é obrigatória'),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export function PaymentSettings() {
  const { currentCompanyId } = useCompanyStore();
  const [qrCode, setQrCode] = useState<{ encodedImage: string; payload: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      value: 100,
      description: 'Mensalidade GBP Político',
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      // Create customer
      const customer = await asaasService.createCustomer({
        name: data.name,
        cpfCnpj: data.cpfCnpj.replace(/\D/g, ''),
        phone: data.phone.replace(/\D/g, ''),
        notificationDisabled: true,
      });

      // Create payment
      const payment = await asaasService.createPayment({
        customer: customer.id,
        billingType: 'PIX',
        value: data.value,
        dueDate: data.dueDate,
        description: data.description,
        externalReference: `company_${currentCompanyId}`,
      });

      // Get PIX QR Code
      const pixQrCode = await asaasService.getPixQRCode(payment.id);
      setQrCode(pixQrCode);
    } catch (error) {
      console.error('Payment error:', error);
      setError(error instanceof Error ? error.message : 'Erro ao processar pagamento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
        Pagamento do Sistema
      </h3>

      {error && (
        <div className="mb-4 p-4 rounded-md bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              CPF/CNPJ
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                {...register('cpfCnpj')}
                className="block w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="000.000.000-00"
              />
            </div>
            {errors.cpfCnpj && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.cpfCnpj.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome
            </label>
            <input
              type="text"
              {...register('name')}
              className="mt-1 block w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Nome completo"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Telefone
            </label>
            <input
              type="tel"
              {...register('phone')}
              className="mt-1 block w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="(00) 00000-0000"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Valor
            </label>
            <input
              type="number"
              {...register('value', { valueAsNumber: true })}
              className="mt-1 block w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="100.00"
            />
            {errors.value && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.value.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Data de Vencimento
            </label>
            <input
              type="date"
              {...register('dueDate')}
              className="mt-1 block w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {errors.dueDate && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.dueDate.message}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição
            </label>
            <input
              type="text"
              {...register('description')}
              className="mt-1 block w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Descrição do pagamento"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.description.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Gerando...
              </>
            ) : (
              <>
                <QrCode className="h-4 w-4 mr-2" />
                Gerar PIX
              </>
            )}
          </button>
        </div>
      </form>

      {qrCode && (
        <div className="mt-8 flex flex-col items-center space-y-4">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
            QR Code PIX
          </h4>
          <img
            src={`data:image/png;base64,${qrCode.encodedImage}`}
            alt="QR Code PIX"
            className="w-48 h-48"
          />
          <div className="w-full max-w-md">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Código PIX
            </label>
            <div className="flex">
              <input
                type="text"
                value={qrCode.payload}
                readOnly
                className="flex-1 px-3 py-2 rounded-l-lg border border-r-0 border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                onClick={() => navigator.clipboard.writeText(qrCode.payload)}
                className="px-4 py-2 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-600 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Copiar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}