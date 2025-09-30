import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Mail, Lock, User, Phone, Globe, MapPin } from 'lucide-react';
import { supabasePublicClient } from '../../lib/supabase';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  // Campos da empresa
  companyName: z.string().min(1, 'Nome da empresa é obrigatório'),
  cnpj: z.string().min(14, 'CNPJ inválido'),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2, 'Use a sigla do estado (2 letras)').optional(),
  zipCode: z.string().optional(),
  companyPhone: z.string().optional(),
  
  // Campos do usuário
  userName: z.string().min(1, 'Nome do usuário é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function Register() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      // 1. Criar empresa
      const { data: companyData, error: companyError } = await supabasePublicClient
        .from('gbp_empresas')
        .insert([{
          nome: data.companyName,
          cnpj: data.cnpj,
          telefone: data.companyPhone,
          website: data.website,
          endereco: data.address,
          cidade: data.city,
          estado: data.state,
          cep: data.zipCode,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (companyError) {
        console.error('Erro ao criar empresa:', companyError);
        throw companyError;
      }

      // 2. Criar usuário na tabela gbp_usuarios
      const { error: userError } = await supabasePublicClient
        .from('gbp_usuarios')
        .insert([{
          nome: data.userName,
          email: data.email,
          senha: data.password,
          contato: data.phone,
          cargo: 'admin',
          nivel_acesso: 'admin',
          empresa_uid: companyData.uid,
          created_at: new Date().toISOString(),
          status: 'active',
        }]);

      if (userError) {
        console.error('Erro ao criar usuário:', userError);
        throw userError;
      }

      toast.success('Registro concluído com sucesso!');
      navigate('/login');
    } catch (error) {
      console.error('Erro no registro:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Criar nova empresa</h2>
          <p className="mt-2 text-sm text-gray-600">
            Preencha os dados abaixo para criar sua empresa e conta de administrador
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Seção da Empresa */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Dados da Empresa</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                    Nome da Empresa *
                  </label>
                  <div className="mt-1 relative">
                    <input
                      {...register('companyName')}
                      type="text"
                      className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Building2 className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">
                    CNPJ *
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('cnpj')}
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {errors.cnpj && (
                    <p className="mt-1 text-sm text-red-600">{errors.cnpj.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700">
                    Telefone
                  </label>
                  <div className="mt-1 relative">
                    <input
                      {...register('companyPhone')}
                      type="tel"
                      className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Phone className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <div className="mt-1 relative">
                    <input
                      {...register('website')}
                      type="url"
                      className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Globe className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                  {errors.website && (
                    <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Endereço
                  </label>
                  <div className="mt-1 relative">
                    <input
                      {...register('address')}
                      type="text"
                      className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <MapPin className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    Cidade
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('city')}
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    Estado
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('state')}
                      type="text"
                      maxLength={2}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Seção do Usuário */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Dados do Administrador</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="userName" className="block text-sm font-medium text-gray-700">
                    Nome *
                  </label>
                  <div className="mt-1 relative">
                    <input
                      {...register('userName')}
                      type="text"
                      className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <User className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                  {errors.userName && (
                    <p className="mt-1 text-sm text-red-600">{errors.userName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Telefone
                  </label>
                  <div className="mt-1 relative">
                    <input
                      {...register('phone')}
                      type="tel"
                      className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Phone className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <div className="mt-1 relative">
                    <input
                      {...register('email')}
                      type="email"
                      className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Senha *
                  </label>
                  <div className="mt-1 relative">
                    <input
                      {...register('password')}
                      type="password"
                      className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirmar Senha *
                  </label>
                  <div className="mt-1 relative">
                    <input
                      {...register('confirmPassword')}
                      type="password"
                      className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Voltar para login
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Criando...
                  </div>
                ) : (
                  'Criar Empresa'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}