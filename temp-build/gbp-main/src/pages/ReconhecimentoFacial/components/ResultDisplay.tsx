import React from 'react';
import { Eleitor } from '../../../types/eleitor';

interface ResultDisplayProps {
  matchedUser: Eleitor | null;
  confidence: number;
  loading: boolean;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ matchedUser, confidence, loading, onReset }) => {
  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Procurando eleitor...</p>
        </div>
      </div>
    );
  }

  if (!matchedUser) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum eleitor encontrado</p>
          <div className="mt-4 space-y-2 text-sm">
            <p className="text-gray-500 dark:text-gray-400">
              Possíveis motivos:
            </p>
            <ul className="list-disc text-left ml-6 text-gray-400 dark:text-gray-500 space-y-1">
              <li>O eleitor ainda não está cadastrado no sistema</li>
              <li>A foto do eleitor está desatualizada</li>
              <li>O ângulo ou iluminação não estão ideais</li>
            </ul>
            <p className="mt-4 text-blue-600 dark:text-blue-400 font-medium">
              Sugestões:
            </p>
            <ul className="list-disc text-left ml-6 text-gray-400 dark:text-gray-500 space-y-1">
              <li>Ajuste a posição do rosto para ficar centralizado</li>
              <li>Certifique-se de ter boa iluminação</li>
              <li>Tente remover óculos ou outros acessórios</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Cabeçalho com foto e match */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          {matchedUser.facial_foto ? (
            <img 
              src={matchedUser.facial_foto} 
              alt={matchedUser.nome || ''} 
              className="h-20 w-20 rounded-full object-cover ring-4 ring-blue-100 dark:ring-blue-900"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          )}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {matchedUser.nome}
            </h3>
            <div className="mt-1 flex items-center">
              <span 
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  confidence >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  confidence >= 70 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}
              >
                <svg
                  className={`w-4 h-4 mr-1.5 ${
                    confidence >= 90 ? 'text-green-500' :
                    confidence >= 70 ? 'text-yellow-500' :
                    'text-red-500'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {confidence.toFixed(1)}% de correspondência
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Informações detalhadas */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">WhatsApp</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {matchedUser.whatsapp ? (
                <a 
                  href={`https://wa.me/55${matchedUser.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {matchedUser.whatsapp}
                </a>
              ) : 'Não informado'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">CPF</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">{matchedUser.cpf || 'Não informado'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Bairro</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">{matchedUser.bairro || 'Não informado'}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">ID do Eleitor</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white font-mono">{matchedUser.uid}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Cadastro</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {matchedUser.created_at ? new Date(matchedUser.created_at).toLocaleDateString() : 'Não informado'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Cidade</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">{matchedUser.cidade || 'Não informado'}</p>
          </div>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => window.location.href = `/app/eleitores/${matchedUser.uid}`}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Ver Perfil Completo
        </button>
        <button
          onClick={() => window.location.href = `/app/atendimentos/novo?eleitor=${matchedUser.uid}`}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Registrar Atendimento
        </button>
      </div>
    </div>
  );
};
