import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Mail, Phone, User, Lock } from 'lucide-react';
import { companyService } from '../services/companies';
import { userService } from '../services/users';

const registrationSchema = z.object({
  // Company fields
  companyName: z.string().min(1, 'Nome da empresa é obrigatório'),
  companyEmail: z.string().email('Email inválido'),
  companyPhone: z.string().optional(),
  
  // User fields
  userName: z.string().min(1, 'Nome do usuário é obrigatório'),
  userEmail: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface CompanyRegistrationProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CompanyRegistration({ onSuccess, onCancel }: CompanyRegistrationProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      // First create the company
      const company = await companyService.create({
        nome: data.companyName.toUpperCase(),
        token: null,
        instancia: null,
        porta: null,
        texto_aniversario: null,
        video_aniversario: null,
        imagem_aniversario: null,
      });

      // Then create the admin user for this company
      await userService.create({
        nome: data.userName.toUpperCase(),
        email: data.userEmail.toLowerCase(),
        senha: data.password,
        nivel_acesso: 'admin',
        empresa_id: company.id,
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error during registration:', error);
      alert('Erro ao criar empresa e usuário. Por favor, tente novamente.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Cadastro de Empresa
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Preencha as informações da empresa e do usuário administrador
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Information Section */}
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Informações da Empresa
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome da Empresa
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                {...register('companyName')}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Nome da empresa"
              />
            </div>
            {errors.companyName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.companyName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email da Empresa
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                {...register('companyEmail')}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="empresa@exemplo.com"
              />
            </div>
            {errors.companyEmail && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.companyEmail.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Telefone (opcional)
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                {...register('companyPhone')}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="(00) 0000-0000"
              />
            </div>
          </div>
        </div>

        {/* Admin User Section */}
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Usuário Administrador
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome do Usuário
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                {...register('userName')}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Nome completo"
              />
            </div>
            {errors.userName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.userName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email do Usuário
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                {...register('userEmail')}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="usuario@exemplo.com"
              />
            </div>
            {errors.userEmail && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.userEmail.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Senha
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                {...register('password')}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="••••••"
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirmar Senha
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                {...register('confirmPassword')}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="••••••"
              />
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </div>
  );
}