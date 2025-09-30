import React, { useState } from 'react';
import { User, Edit2, Trash2, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'attendant';
  status: 'active' | 'inactive';
  lastLogin: string;
}

const mockUsers: SystemUser[] = [
  {
    id: '1',
    name: 'Admin',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    lastLogin: '2024-03-10 15:30',
  },
  {
    id: '2',
    name: 'João Silva',
    email: 'joao@example.com',
    role: 'attendant',
    status: 'active',
    lastLogin: '2024-03-10 14:20',
  },
];

export function UserList() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      <div className="px-4 py-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full group"
        >
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Usuários do Sistema
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-1">
            {mockUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user.role === 'admin' ? 'Administrador' : 'Atendente'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
                    title="Editar usuário"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
                    title="Remover usuário"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center w-full px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Usuário
            </button>
          </div>
        )}
      </div>

      {/* Modal de Adicionar Usuário */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowAddUser(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Adicionar Novo Usuário
              </h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nível de Acesso
                  </label>
                  <select className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:text-white">
                    <option value="admin">Administrador</option>
                    <option value="attendant">Atendente</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}