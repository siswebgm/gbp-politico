import { useState } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, Eye, MousePointer, Filter, ArrowLeft, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationLogs } from '../../../hooks/useNotificationLogs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function HistoricoNotificacoes() {
  const navigate = useNavigate();
  const { logs, stats, userStats, loading, error } = useNotificationLogs();
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'enviada' | 'entregue' | 'visualizada' | 'erro'>('todos');
  const [filtroCampanha, setFiltroCampanha] = useState<string>('');

  // Disparos únicos detectados nos logs
  const campanhas = (() => {
    const map = new Map<string, { uid: string; nome: string; data: string; total: number }>();
    logs.forEach((l) => {
      if (!l.campanha_uid) return;
      const atual = map.get(l.campanha_uid);
      if (atual) {
        map.set(l.campanha_uid, {
          ...atual,
          data: l.data_criacao > atual.data ? l.data_criacao : atual.data,
          total: atual.total + 1
        });
      } else {
        map.set(l.campanha_uid, {
          uid: l.campanha_uid,
          nome: l.campanha_nome || 'Disparo sem nome',
          data: l.data_criacao,
          total: 1
        });
      }
    });
    return [...map.values()].sort((a, b) => b.data.localeCompare(a.data));
  })();

  const logsFiltrados = logs.filter(log => {
    if (filtroCampanha && log.campanha_uid !== filtroCampanha) return false;
    if (filtroStatus === 'todos') return true;
    if (filtroStatus === 'enviada') return log.enviada;
    if (filtroStatus === 'entregue') return log.entregue;
    if (filtroStatus === 'visualizada') return log.visualizada;
    if (filtroStatus === 'erro') return log.erro;
    return true;
  });
  
  // Estatísticas recalculadas para o disparo selecionado (ou globais)
  const statsVista = (() => {
    if (!filtroCampanha) return stats;
    const base = logs.filter(l => l.campanha_uid === filtroCampanha);
    const total = base.length;
    if (total === 0) return stats;
    const enviadas = base.filter(l => l.enviada).length;
    const entregues = base.filter(l => l.entregue).length;
    const visualizadas = base.filter(l => l.visualizada).length;
    const clicadas = base.filter(l => l.clicada).length;
    return {
      total, enviadas, entregues, visualizadas, clicadas,
      taxa_entrega: total > 0 ? (entregues / total) * 100 : 0,
      taxa_visualizacao: total > 0 ? (visualizadas / total) * 100 : 0,
      taxa_clique: total > 0 ? (clicadas / total) * 100 : 0
    };
  })();

  const campanhaSelecionada = campanhas.find(c => c.uid === filtroCampanha);

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
        
        {/* Banner do disparo selecionado */}
        {campanhaSelecionada && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-3">
            <Megaphone className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 truncate">
                {campanhaSelecionada.nome}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {campanhaSelecionada.total} destinatário{campanhaSelecionada.total !== 1 ? 's' : ''} · {format(new Date(campanhaSelecionada.data), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFiltroCampanha('')}
              className="text-xs text-blue-700 dark:text-blue-300 hover:underline whitespace-nowrap"
            >
              Ver todos
            </button>
          </div>
        )}

        {/* Estatísticas */}
        {statsVista && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Enviadas
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {statsVista.enviadas}
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
                {statsVista.entregues}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {statsVista.taxa_entrega.toFixed(1)}% de entrega
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
                {statsVista.visualizadas}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {statsVista.taxa_visualizacao.toFixed(1)}% visualizadas
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
                {statsVista.clicadas}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {statsVista.taxa_clique.toFixed(1)}% de clique
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-3">
          {campanhas.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <Megaphone className="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Filtrar por disparo:</span>
              </div>
              <select
                value={filtroCampanha}
                onChange={(e) => setFiltroCampanha(e.target.value)}
                className="w-full sm:w-auto min-w-0 sm:min-w-[16rem] px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os disparos</option>
                {campanhas.map(c => (
                  <option key={c.uid} value={c.uid}>
                    {c.nome} — {format(new Date(c.data), 'dd/MM HH:mm')} ({c.total})
                  </option>
                ))}
              </select>
            </div>
          )}
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
                        {log.campanha_nome && (
                          <button
                            type="button"
                            onClick={() => setFiltroCampanha(log.campanha_uid || '')}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50"
                            title="Ver resultado deste disparo"
                          >
                            <Megaphone className="h-3 w-3" />
                            {log.campanha_nome}
                          </button>
                        )}
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
