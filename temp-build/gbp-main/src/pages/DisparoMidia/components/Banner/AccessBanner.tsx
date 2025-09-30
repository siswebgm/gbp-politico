import React from 'react';
import { AlertCircle, Building2, User } from 'lucide-react';

interface AccessBannerProps {
  userName: string;
  userAccess: string;
  companyName: string;
}

export function AccessBanner({ userName, userAccess, companyName }: AccessBannerProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-blue-500" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Informações de Acesso
          </h3>
          <div className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              <span>Usuário: <strong>{userName}</strong></span>
            </div>
            <div className="flex items-center">
              <Building2 className="h-4 w-4 mr-2" />
              <span>Empresa: <strong>{companyName}</strong></span>
            </div>
            <p className="mt-2 text-sm">
              <strong>Nível de Acesso:</strong> {userAccess}
            </p>
            <p className="mt-2 text-sm">
              Esta página permite o envio de mensagens em massa para eleitores. Apenas usuários com nível de acesso adequado podem utilizar esta funcionalidade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
