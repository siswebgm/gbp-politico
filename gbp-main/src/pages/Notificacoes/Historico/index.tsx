import { useState } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, Eye, MousePointer, Filter, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationLogs } from '../../../hooks/useNotificationLogs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function HistoricoNotificacoes() {
  const navigate = useNavigate();
  const { logs, stats, userStats, loading, error } = useNotificationLogs();
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'enviada' | 'entregue' | 'visualizada' | 'erro'>('todos');
  
  const logsFiltrados = logs.filter(log => {
    if (filtroStatus === 'todos') return true;
    if (filtroStatus === 'enviada') return log.enviada;
    if (filtroStatus === 'entregue') return log.entregue;
    if (filtroStatus === 'visualizada') return log.visualizada;
    if (filtroStatus === 'erro') return log.erro;
    return true;
  });
  
  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="space-y-4 pb-6">
        <header className="flex items-center gap-2 sm:gap-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            title="Voltar"
            aria-label="Voltar"
            className="inline-flex items-center justify-center w-10 h-10 flex-shrink-0 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold leading-tight text-gray-900 dark:text-white">
              Histórico de Notificações
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Acompanhe o envio e o status dos avisos
            </p>
          </div>
        </header>
        
        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Enviadas
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.enviadas}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Entregues
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.entregues}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.taxa_entrega.toFixed(1)}% de entrega
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Visualizadas
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.visualizadas}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.taxa_visualizacao.toFixed(1)}% visualizadas
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <MousePointer className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Clicadas
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.clicadas}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.taxa_clique.toFixed(1)}% de clique
              </p>
            </div>
          </div>
        )}
        
        {/* Estatísticas de Usuários */}
        {userStats && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Usuários com Notificação Ativa
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total de Usuários</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{userStats.total}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Com Token Ativo</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{userStats.ativos}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tokens Inválidos</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">{userStats.invalidos}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sem Permissão</p>
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{userStats.sem_permissao}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Filter className="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Filtrar por status:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'todos', label: 'Todos' },
                { value: 'enviada', label: 'Enviadas' },
                { value: 'entregue', label: 'Entregues' },
                { value: 'visualizada', label: 'Visualizadas' },
                { value: 'erro', label: 'Com Erro' }
              ].map((filtro) => (
                <button
                  key={filtro.value}
                  onClick={() => setFiltroStatus(filtro.value as any)}
                  className={`px-3 py-1.5 text-sm whitespace-nowrap rounded-md transition-colors ${
                    filtroStatus === filtro.value
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {filtro.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Lista de Logs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Carregando histórico...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500 dark:text-red-400">
              {error}
            </div>
          ) : logsFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Nenhuma notificação encontrada
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {logsFiltrados.map((log) => (
                <div key={log.uid} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white break-words min-w-0">
                          {log.titulo}
                        </h3>
                        {log.erro ? (
                          <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
                        ) : log.visualizada ? (
                          <Eye className="h-4 w-4 flex-shrink-0 mt-0.5 text-purple-500" />
                        ) : log.entregue ? (
                          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-500" />
                        ) : log.enviada ? (
                          <Clock className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 break-words">
                        {log.mensagem}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          {format(new Date(log.data_criacao), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {log.tipo_midia && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                            {log.tipo_midia}
                          </span>
                        )}
                      </div>
                      {log.erro && (
                        <p className="mt-2 text-xs text-red-600 dark:text-red-400 break-words">
                          Erro: {log.erro}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:justify-end sm:max-w-[40%]">
                      {log.enviada && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded">
                          Enviada
                        </span>
                      )}
                      {log.entregue && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded">
                          Entregue
                        </span>
                      )}
                      {log.visualizada && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded">
                          Visualizada
                        </span>
                      )}
                      {log.clicada && (
                        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded">
                          Clicada
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
