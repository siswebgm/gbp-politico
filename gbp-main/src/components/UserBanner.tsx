import React from 'react';
import { useCompanyStore } from '../store/useCompanyStore';
import { Shield, Building2, Mail, User2 } from 'lucide-react';

interface UserBannerProps {
  pageTitle: string;
  pageDescription: string;
}

export function UserBanner({ pageTitle, pageDescription }: UserBannerProps) {
  const user = useCompanyStore((state) => state.user);
  const company = useCompanyStore((state) => state.company);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 mb-6">
      <div className="flex flex-col space-y-4">
        {/* Título e Descrição da Página */}
        <div className="border-b dark:border-gray-700 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{pageDescription}</p>
        </div>

        {/* Informações do Usuário e Empresa */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Usuário */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <User2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Usuário</p>
              <p className="font-medium text-gray-900 dark:text-white">{user?.nome || 'N/A'}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
              <p className="font-medium text-gray-900 dark:text-white">{user?.email || 'N/A'}</p>
            </div>
          </div>

          {/* Empresa */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Empresa</p>
              <p className="font-medium text-gray-900 dark:text-white">{company?.nome || 'N/A'}</p>
            </div>
          </div>

          {/* Permissão */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Permissão</p>
              <p className="font-medium text-gray-900 dark:text-white capitalize">{user?.cargo || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
