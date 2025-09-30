import React from 'react';
import { User, Mail, Shield, Clock, MoreVertical, Lock, Unlock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUsers } from '../../../hooks/useUsers';
import { Menu } from '@headlessui/react';

interface UserListProps {
  filters: {
    search: string;
    role: string;
    status: string;
  };
}

export function UserList({ filters }: UserListProps) {
  const { users, blockUser, deleteUser, isLoading, error } = useUsers(filters);

  const handleBlock = async (userId: number) => {
    if (window.confirm('Tem certeza que deseja bloquear este usuário?')) {
      await blockUser.mutateAsync(userId);
    }
  };

  const handleDelete = async (userId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      await deleteUser.mutateAsync(userId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 dark:text-red-400 py-8">
        Erro ao carregar usuários
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Usuário
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Função
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Último Acesso
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users?.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.nome}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Mail className="h-4 w-4 mr-2" />
                    {user.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Shield className="h-4 w-4 mr-2" />
                    {user.nivel_acesso === 'admin' ? 'Administrador' : 'Atendente'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="h-4 w-4 mr-2" />
                    {format(new Date(user.ultimo_acesso || user.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {user.status === 'active' ? 'Ativo' : 'Bloqueado'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <MoreVertical className="h-5 w-5" />
                    </Menu.Button>
                    <Menu.Items className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => handleBlock(user.id)}
                            className={`${
                              active ? 'bg-gray-100 dark:bg-gray-600' : ''
                            } group flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                          >
                            {user.status === 'active' ? (
                              <>
                                <Lock className="h-4 w-4 mr-2" />
                                Bloquear
                              </>
                            ) : (
                              <>
                                <Unlock className="h-4 w-4 mr-2" />
                                Desbloquear
                              </>
                            )}
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => handleDelete(user.id)}
                            className={`${
                              active ? 'bg-gray-100 dark:bg-gray-600' : ''
                            } group flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Menu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}