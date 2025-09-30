import React, { useState } from 'react';
import { useEditMode } from '../contexts/EditModeContext';

const AdminLogin: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { login, isAdmin } = useEditMode();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Tentativa de login com senha:', password);
    const success = login(password);
    console.log('Resultado do login:', success);
    if (!success) {
      console.log('Senha incorreta');
      setError('Senha incorreta');
    } else {
      console.log('Login bem-sucedido');
    }
  };

  if (isAdmin) return null;

  if (isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200 w-64">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Acesso Administrativo</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-2">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Digite a senha"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              Acessar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-4 right-4 z-50 w-10 h-10 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
      title="Acesso administrativo"
      aria-label="Acesso administrativo"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
      </svg>
    </button>
  );
};

export default AdminLogin;
