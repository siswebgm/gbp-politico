import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Copy, ExternalLink, MessageCircle, Users, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCompanyStore } from '../../../store/useCompanyStore';
import {
  notificationSubscribersService,
  NotificacaoInscrito
} from '../../../services/notificationSubscribers';

export default function ConfiguracaoNotificacoes() {
  const { company } = useCompanyStore();
  const navigate = useNavigate();
  const [inscritos, setInscritos] = useState<NotificacaoInscrito[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroPermissao, setFiltroPermissao] = useState<'todos' | 'autorizou' | 'nao_autorizou'>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [paraExcluir, setParaExcluir] = useState<NotificacaoInscrito | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const link = company?.uid ? notificationSubscribersService.gerarLinkConvite(company.uid) : '';

  const carregar = useCallback(async () => {
    if (!company?.uid) return;
    setLoading(true);
    try {
      setInscritos(await notificationSubscribersService.listarPorEmpresa(company.uid));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [company?.uid]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copiado!');
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  const mensagemConvite = `Olá! Ative as notificações para receber nossos avisos: ${link}`;
  const linkWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensagemConvite)}`;

  const alternarAtivo = async (inscrito: NotificacaoInscrito) => {
    try {
      await notificationSubscribersService.alterarAtivo(inscrito.uid, !inscrito.ativo);
      setInscritos((prev) =>
        prev.map((i) => (i.uid === inscrito.uid ? { ...i, ativo: !i.ativo } : i))
      );
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const confirmarExclusao = async () => {
    if (!paraExcluir) return;
    setExcluindo(true);
    try {
      await notificationSubscribersService.excluir(paraExcluir.uid);
      setInscritos((prev) => prev.filter((i) => i.uid !== paraExcluir.uid));
      toast.success('Inscrito excluído');
      setParaExcluir(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setExcluindo(false);
    }
  };

  const inscritosFiltrados = inscritos.filter((i) => {
    if (filtroPermissao === 'autorizou' && i.permissao !== 'granted') return false;
    if (filtroPermissao === 'nao_autorizou' && i.permissao === 'granted') return false;
    if (filtroStatus === 'ativo' && !i.ativo) return false;
    if (filtroStatus === 'inativo' && i.ativo) return false;
    return true;
  });

  const opcoesPermissao = [
    { value: 'todos', label: 'Todos', total: inscritos.length },
    { value: 'autorizou', label: 'Autorizou', total: inscritos.filter((i) => i.permissao === 'granted').length },
    { value: 'nao_autorizou', label: 'Não autorizou', total: inscritos.filter((i) => i.permissao !== 'granted').length }
  ] as const;

  const opcoesStatus = [
    { value: 'todos', label: 'Todos', total: inscritos.length },
    { value: 'ativo', label: 'Ativos', total: inscritos.filter((i) => i.ativo).length },
    { value: 'inativo', label: 'Inativos', total: inscritos.filter((i) => !i.ativo).length }
  ] as const;

  const classeSegmento = (ativo: boolean) =>
    `flex-1 min-w-0 px-2 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap truncate transition-colors ${
      ativo
        ? 'bg-white dark:bg-gray-600 text-blue-700 dark:text-blue-300 shadow-sm'
        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
    }`;

  const autorizados = inscritos.filter((i) => i.permissao === 'granted').length;
  const negados = inscritos.filter((i) => i.permissao === 'denied').length;
  const comToken = inscritos.filter((i) => !!i.token).length;

  const cards = [
    { label: 'Total de acessos', valor: inscritos.length, cor: 'text-blue-600' },
    { label: 'Autorizaram', valor: autorizados, cor: 'text-green-600' },
    { label: 'Negaram', valor: negados, cor: 'text-red-600' },
    { label: 'Com token de envio', valor: comToken, cor: 'text-purple-600' }
  ];

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
              Configuração de Notificações
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Compartilhe o link de convite
            </p>
          </div>
        </header>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Link de convite da sua empresa
          </h2>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full md:flex-1 min-w-0 px-4 py-2.5 text-base sm:text-sm truncate border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white text-sm"
            />
            <div className="grid grid-cols-3 md:flex gap-2 md:gap-3">
            <button
              onClick={copiar}
              disabled={!link}
              className="flex items-center justify-center gap-1.5 px-2 md:px-4 py-2.5 text-sm whitespace-nowrap bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              <Copy className="h-4 w-4 flex-shrink-0" />
              Copiar
            </button>
            <a
              href={linkWhatsApp}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 px-2 md:px-4 py-2.5 text-sm whitespace-nowrap bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4 flex-shrink-0" />
              WhatsApp
            </a>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 px-2 md:px-4 py-2.5 text-sm whitespace-nowrap border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ExternalLink className="h-4 w-4 flex-shrink-0" />
              Abrir
            </a>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Quem abrir o link poderá autorizar as notificações.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{c.label}</p>
              <p className={`text-2xl font-bold ${c.cor}`}>{c.valor}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
            <Users className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Inscritos</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">({inscritosFiltrados.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Permissão</p>
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                {opcoesPermissao.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setFiltroPermissao(o.value)}
                    className={classeSegmento(filtroPermissao === o.value)}
                  >
                    {o.label} ({o.total})
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Status de envio</p>
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                {opcoesStatus.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setFiltroStatus(o.value)}
                    className={classeSegmento(filtroStatus === o.value)}
                  >
                    {o.label} ({o.total})
                  </button>
                ))}
              </div>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : inscritosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {inscritos.length === 0 ? 'Nenhum inscrito ainda' : 'Nenhum inscrito neste filtro'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {inscritosFiltrados.map((i) => (
                <div key={i.uid} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white break-words">
                      {i.nome || 'Sem nome'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 break-words">
                      {i.telefone || 'Sem telefone'} ·{' '}
                      {format(new Date(i.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-3 sm:pt-0 border-t border-gray-100 dark:border-gray-700 sm:border-0">
                    {i.permissao === 'granted' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 whitespace-nowrap">
                        <CheckCircle className="h-4 w-4" /> Autorizou
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 whitespace-nowrap">
                        <XCircle className="h-4 w-4" /> Não autorizou
                      </span>
                    )}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={i.ativo}
                        aria-label={i.ativo ? 'Desativar inscrito' : 'Ativar inscrito'}
                        onClick={() => alternarAtivo(i)}
                        className="flex items-center gap-2"
                      >
                        <span
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                            i.ativo ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              i.ativo ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </span>
                        <span className="w-12 text-left text-xs font-medium text-gray-600 dark:text-gray-300">
                          {i.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </button>
                      <button
                        onClick={() => setParaExcluir(i)}
                        title="Excluir inscrito"
                        aria-label="Excluir inscrito"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {paraExcluir && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
          onClick={() => !excluindo && setParaExcluir(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 px-5 py-6 sm:p-6 shadow-xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Trash2 className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 whitespace-nowrap">Excluir inscrito?</h3>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-2 mb-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {paraExcluir.nome || 'Sem nome'}
              </p>
              {paraExcluir.telefone && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{paraExcluir.telefone}</p>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              <span className="block">Ele deixará de receber avisos.</span>
              <span className="block">Esta ação não pode ser desfeita.</span>
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setParaExcluir(null)}
                disabled={excluindo}
                className="py-2.5 rounded-lg whitespace-nowrap border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                disabled={excluindo}
                className="py-2.5 rounded-lg whitespace-nowrap bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
