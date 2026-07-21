import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  X,
  Send,
  User,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useCategories } from '../../hooks/useCategories';
import { eleitorService } from '../../services/eleitorService';
import { assistantTrainingService } from '../../services/assistantTrainingService';
import { assistantModules, detectModule } from './registry';
import type { AssistantContext, AssistantIntent, AssistantResult, AssistantQuery } from './types';

interface MessageAction {
  label: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  result?: AssistantResult;
  actions?: MessageAction[];
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  text: 'Olá! Sou a GBia, sua assistente do GBP. Estou à disposição para ajudar. Faça sua pergunta!'
};

export function AppAssistant() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [gbiaImageUrl] = useState(() => `/images/GBia.png?v=${Date.now()}`);
  const [isLoading, setIsLoading] = useState(false);
  const [indicadores, setIndicadores] = useState<{ uid: string; nome: string }[]>([]);
  const [responsaveis, setResponsaveis] = useState<{ uid: string; nome: string }[]>([]);
  const [bairros, setBairros] = useState<string[]>([]);
  const [customIntents, setCustomIntents] = useState<AssistantIntent[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastResultRef = useRef<AssistantResult | null>(null);

  const company = useCompanyStore((state: { company: any }) => state.company);
  const empresaUid = company?.uid;
  const statusWpp = company?.status_wpp || 'close';
  const { data: categories = [] } = useCategories();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!empresaUid) return;

    const loadLists = async () => {
      try {
        const [ind, resp, brs, intents] = await Promise.all([
          eleitorService.getIndicadoresOptions(empresaUid),
          eleitorService.getResponsaveisOptions(empresaUid),
          eleitorService.getBairrosOptions(empresaUid),
          assistantTrainingService.listar().catch(() => []),
        ]);
        setIndicadores(ind);
        setResponsaveis(resp);
        setBairros(brs);
        setCustomIntents(intents || []);
      } catch (error) {
        console.error('Erro ao carregar listas do assistente:', error);
      }
    };

    loadLists();
  }, [empresaUid]);

  const context: AssistantContext = {
    empresaUid: empresaUid || '',
    companyName: company?.nome,
    categories,
    indicadores,
    responsaveis,
    bairros,
    statusWpp,
    customIntents,
  };

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || !empresaUid) return;

      const userMessage: Message = { id: Date.now().toString(), role: 'user', text };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      try {
        let module = detectModule(text, context);
        let query: AssistantQuery | null = null;

        if (!module && lastResultRef.current) {
          const lastModuleName = lastResultRef.current.module;
          const fallbackModule = assistantModules.find((m) => m.name === lastModuleName);
          if (fallbackModule) {
            const fallbackContext: AssistantContext = { ...context, previousFilters: lastResultRef.current.filters };
            const fallbackQuery = fallbackModule.parse(text, fallbackContext);
            if (fallbackQuery) {
              module = fallbackModule;
              query = fallbackQuery;
            }
          }
        }

        if (!module) {
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              text: 'Ainda não consigo responder sobre esse tema. No momento, entendo perguntas sobre **Pessoas**, **Atendimentos** e **Demandas**. Pergunte algo como "quantos cadastros essa semana", "atendimentos pendentes" ou "demandas concluídas".',
            },
          ]);
          return;
        }

        if (!query) {
          query = module.parse(text, context);
        }
        if (!query) {
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              text: 'Não entendi a pergunta. Tente usar palavras-chave como "quantos", "esse mês", "por categoria", "pendentes" etc.',
            },
          ]);
          return;
        }

        const result = await module.execute(query, context);
        lastResultRef.current = result;

        const formatCount = (n: number) => n.toLocaleString('pt-BR');

        let responseText = '';
        let responseActions: MessageAction[] | undefined;

        if (result.module === 'whatsapp') {
          const isConnected = context.statusWpp === 'open';
          responseText = isConnected
            ? 'O WhatsApp do gabinete está **conectado**.'
            : 'O WhatsApp do gabinete **não está conectado**.';
          if (!isConnected) {
            responseActions = [{ label: 'Conectar WhatsApp', href: '/app/whatsapp' }];
          }
        } else if (result.action === 'custom') {
          responseText = result.customResponse || 'Ainda não sei responder isso.';
        } else if (result.action === 'count') {
          responseText = `Encontrei **${formatCount(result.count || 0)}** resultado${result.count === 1 ? '' : 's'} em **${result.displayTitle || 'Sistema'}** para: _${result.description}_.`;
        } else if (result.action === 'group') {
          responseText = `Encontrei **${formatCount(result.count || 0)}** resultado${result.count === 1 ? '' : 's'} em **${result.displayTitle || 'Sistema'}** agrupados por ${groupLabel(result.groupBy, result.module)}: _${result.description}_.`;
        } else {
          responseText = `Encontrei **${formatCount(result.count || 0)}** resultado${result.count === 1 ? '' : 's'} em **${result.displayTitle || 'Sistema'}** para: _${result.description}_.`;
        }

        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: 'assistant', text: responseText, result, actions: responseActions },
        ]);
      } catch (error) {
        console.error('Erro no assistente:', error);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            text: `Desculpe, ocorreu um erro: ${error instanceof Error ? error.message : 'tente novamente'}.`,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [context, empresaUid]
  );

  const addClearConfirmMessage = useCallback(() => {
    const confirmId = `clear-confirm-${Date.now()}`;
    setMessages((prev) => [
      ...prev.filter((m) => !m.id.startsWith('clear-confirm')),
      {
        id: confirmId,
        role: 'assistant',
        text: 'Deseja reiniciar a conversa?',
        actions: [
          {
            label: 'Não',
            variant: 'ghost',
            className: 'h-7 px-3 text-[11px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700',
            onClick: () => {
              setMessages((prevMessages) => prevMessages.filter((m) => m.id !== confirmId));
            },
          },
          {
            label: 'Sim, limpar',
            variant: 'default',
            className: 'h-7 px-3 text-[11px] bg-red-500/90 hover:bg-red-600 text-white border-transparent',
            onClick: () => {
              setMessages([WELCOME_MESSAGE]);
              lastResultRef.current = null;
            },
          },
        ],
      },
    ]);
  }, []);

  const handleExport = useCallback(
    async (result: AssistantResult, format: 'pdf' | 'excel') => {
      try {
        const module = assistantModules.find((m) => m.name === result.module);
        if (!module) return;
        await module.export(result, format, context);
      } catch (error) {
        console.error('Erro ao exportar:', error);
        alert('Erro ao gerar arquivo. Tente novamente.');
      }
    },
    [context]
  );

  const quickQuestions = assistantModules.flatMap((m) => m.quickQuestions);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={!isOpen && statusWpp !== 'open' ? 'Abrir assistente — WhatsApp desconectado' : 'Abrir assistente'}
        title={!isOpen && statusWpp !== 'open' ? 'WhatsApp desconectado — clique para conectar' : 'Abrir assistente'}
        className={`fixed bottom-16 left-4 md:bottom-20 md:left-6 z-[100] !h-11 !w-11 md:!h-12 md:!w-12 !p-0 rounded-full shadow-xl ring-2 ring-white/60 dark:ring-white/40 flex !flex-none items-center justify-center transition-colors duration-200 animate-float relative overflow-hidden ${
          isOpen ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-transparent'
        }`}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <img src={gbiaImageUrl} alt="GBia" className="h-11 w-11 md:h-12 md:w-12 rounded-full object-cover" />
        )}
        {!isOpen && statusWpp !== 'open' && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white border-2 border-white dark:border-gray-900 shadow-sm" aria-hidden="true">
            1
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 sm:bottom-24 left-3 sm:left-4 md:left-6 z-[100] w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] md:w-[28rem] h-[calc(100vh-9rem)] sm:h-[32rem] max-h-[32rem] sm:max-h-[40rem] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
            <div className="flex items-center gap-2">
              <img src={gbiaImageUrl} alt="GBia" title="GBia" className="h-7 w-7 shrink-0 rounded-full object-cover border border-white/30" />
              <span className="font-semibold text-sm">Assistente GBia</span>
              {statusWpp === 'open' ? (
                <span title="WhatsApp conectado" aria-label="WhatsApp conectado">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                </span>
              ) : (
                <span title="WhatsApp desconectado" aria-label="WhatsApp desconectado">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={addClearConfirmMessage}
                className="p-1.5 hover:bg-blue-700 rounded-full transition-colors"
                aria-label="Reiniciar conversa"
                title="Reiniciar conversa"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-blue-700 rounded-full transition-colors"
                aria-label="Fechar assistente"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
            {statusWpp !== 'open' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-xl p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-300">WhatsApp desconectado</p>
                    <p className="text-red-600 dark:text-red-400 text-xs mt-0.5">
                      O WhatsApp do gabinete não está conectado ao sistema.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/app/whatsapp')}
                    className="text-xs font-medium text-red-700 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-900/50 dark:hover:bg-red-950/30"
                  >
                    Conectar
                  </Button>
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[92%] sm:max-w-[85%] w-full min-w-0 rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-100 text-blue-900 rounded-br-none'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-none shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {msg.role === 'assistant' ? (
                      <img src={gbiaImageUrl} alt="" className="h-3.5 w-3.5 shrink-0 rounded-full object-cover" />
                    ) : (
                      <User className="h-3.5 w-3.5" />
                    )}
                    <span className="text-xs opacity-75">
                      {msg.role === 'assistant' ? 'GBia' : 'Você'}
                    </span>
                  </div>
                  <div className="leading-relaxed">{renderMessage(msg.text)}</div>

                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {msg.actions.map((action, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          variant={action.variant || 'outline'}
                          onClick={() => {
                            if (action.href) navigate(action.href);
                            action.onClick?.();
                          }}
                          className={
                            action.className ||
                            'text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:border-blue-900/40 dark:bg-blue-950/20 dark:hover:bg-blue-950/40'
                          }
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}

                  {msg.result && msg.result.module === 'whatsapp' && (
                    <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <span className={`h-3 w-3 rounded-full ${msg.result.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <div className={`text-sm font-semibold ${msg.result.isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {msg.result.isConnected ? 'Conectado' : 'Desconectado'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {msg.result.isConnected
                              ? 'WhatsApp ativo e sincronizado com o sistema.'
                              : 'WhatsApp fora do ar. Clique em "Conectar WhatsApp" para reativar.'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {msg.result && msg.result.module !== 'whatsapp' && msg.result.action !== 'custom' && (
                    <div className="mt-3 space-y-3">
                      {msg.result.action === 'count' && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {(msg.result.count || 0).toLocaleString('pt-BR')}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            resultado(s)
                          </div>
                        </div>
                      )}

                      {msg.result.action === 'group' && msg.result.groups && (
                        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-100 dark:bg-gray-700">
                              <tr>
                                <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">
                                  {groupLabel(msg.result.groupBy, msg.result.module)}
                                </th>
                                <th className="text-right px-3 py-2 font-medium text-gray-700 dark:text-gray-200">
                                  Quantidade
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                              {msg.result.groups.slice(0, 10).map((group) => (
                                <tr key={group.key}>
                                  <td className="px-3 py-2 text-gray-800 dark:text-gray-100 truncate max-w-[10rem]">
                                    {group.label || '(não informado)'}
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold text-blue-600 dark:text-blue-400">
                                    {group.count.toLocaleString('pt-BR')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {msg.result.action === 'list' && msg.result.rows && (
                        <>
                          <div
                            className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700"
                          >
                            {renderRows(msg.result.rows, msg.result.module, msg.result.count || 0)}
                          </div>
                          {(msg.result.count || 0) > msg.result.rows.length && (
                            <div className="text-xs text-gray-500 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-b-xl">
                              Mostrando {msg.result.rows.length} de {msg.result.count} resultados. Exporte para ver todos.
                            </div>
                          )}
                        </>
                      )}

                      {(msg.result.count || 0) > 0 && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExport(msg.result!, 'pdf')}
                            className="flex-1 text-xs font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:border-red-900/40 dark:bg-red-950/20 dark:hover:bg-red-950/40"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExport(msg.result!, 'excel')}
                            className="flex-1 text-xs font-medium text-green-600 border border-green-200 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:border-green-900/40 dark:bg-green-950/20 dark:hover:bg-green-950/40"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                            Excel
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">Pensando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto pb-2 hide-scrollbar">
              <div className="flex gap-2 min-w-max">
                {quickQuestions.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSend(chip)}
                    className="whitespace-nowrap px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs text-gray-700 dark:text-gray-200 rounded-full transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend(input);
                }}
                placeholder="Ex: quantos cadastros essa semana no bairro Centro"
                className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <Button
                size="icon"
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isLoading}
                className="h-10 w-10 rounded-xl"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function groupLabel(groupBy: string | undefined, module: string) {
  if (module === 'pessoas') {
    switch (groupBy) {
      case 'categoria_uid': return 'Categoria';
      case 'bairro': return 'Bairro';
      case 'cidade': return 'Cidade';
      case 'genero': return 'Gênero';
      case 'indicado_uid': return 'Indicado';
      case 'usuario_uid': return 'Responsável';
    }
  }
  if (module === 'attendances') {
    switch (groupBy) {
      case 'categoria_uid': return 'Categoria';
      case 'tipo_de_atendimento': return 'Tipo';
      case 'status': return 'Status';
      case 'usuario_uid': return 'Responsável';
      case 'bairro': return 'Bairro';
      case 'cidade': return 'Cidade';
    }
  }
  if (module === 'demandas') {
    switch (groupBy) {
      case 'tipo_de_demanda': return 'Tipo';
      case 'status': return 'Status';
      case 'nivel_de_urgencia': return 'Urgência';
      case 'bairro': return 'Bairro';
      case 'cidade': return 'Cidade';
    }
  }
  if (module === 'oficios') {
    switch (groupBy) {
      case 'tipo_de_demanda': return 'Tipo';
      case 'status_solicitacao': return 'Status';
      case 'nivel_de_urgencia': return 'Urgência';
      case 'bairro': return 'Bairro';
      case 'cidade': return 'Cidade';
      case 'responsavel_uid': return 'Responsável';
    }
  }
  if (module === 'projetos_lei') {
    switch (groupBy) {
      case 'status': return 'Status';
      case 'autor': return 'Autor';
      case 'ano': return 'Ano';
      case 'responsavel': return 'Responsável';
    }
  }
  if (module === 'requerimentos') {
    switch (groupBy) {
      case 'tipo': return 'Tipo';
      case 'status': return 'Status';
      case 'prioridade': return 'Prioridade';
      case 'solicitante': return 'Solicitante';
    }
  }
  if (module === 'emendas') {
    switch (groupBy) {
      case 'tipo': return 'Tipo';
      case 'status': return 'Status';
      case 'ano': return 'Ano';
      case 'beneficiario': return 'Beneficiário';
      case 'beneficiario_municipio': return 'Município';
      case 'beneficiario_estado': return 'Estado';
    }
  }
  if (module === 'agendamentos') {
    switch (groupBy) {
      case 'type': return 'Tipo';
      case 'status': return 'Status';
      case 'prioridade': return 'Prioridade';
      case 'task_responsible': return 'Responsável';
      case 'location': return 'Local';
    }
  }
  return 'Grupo';
}

function renderRows(rows: any[], module: string, total: number) {
  if (module === 'pessoas') {
    return (
      <>
        <table className="min-w-full text-xs">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Nome</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Cidade/Bairro</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Categoria</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {rows.map((row, idx) => (
              <tr key={row.uid || idx}>
                <td className="px-3 py-2 text-gray-800 dark:text-gray-100 whitespace-nowrap">
                  {row.uid ? (
                    <Link
                      to={`/app/pessoas/${row.uid}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      title="Abrir ficha do eleitor"
                    >
                      {row.nome || '-'}
                    </Link>
                  ) : (
                    row.nome || '-'
                  )}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {[row.cidade, row.bairro].filter(Boolean).join(' / ') || '-'}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{row.categoria_nome || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  if (module === 'attendances') {
    return (
      <>
        <table className="min-w-full text-xs">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Descrição</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Status</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Categoria</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Nome</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">WhatsApp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {rows.map((row, idx) => (
              <tr key={row.uid || row.id || idx}>
                <td className="px-3 py-2 text-gray-800 dark:text-gray-100 whitespace-nowrap">{row.descricao || '-'}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{row.status || '-'}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{row.categoria_nome || '-'}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{row.eleitor_nome || '-'}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{row.eleitor_whatsapp || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  if (module === 'demandas') {
    return (
      <>
        <table className="min-w-full text-xs">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Tipo</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Status/Urgência</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Local</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {rows.map((row, idx) => (
              <tr key={row.uid || idx}>
                <td className="px-3 py-2 text-gray-800 dark:text-gray-100 whitespace-nowrap">{row.tipo_de_demanda || '-'}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {[row.status, row.nivel_de_urgencia].filter(Boolean).join(' / ') || '-'}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {[row.cidade, row.bairro, row.logradouro].filter(Boolean).join(' / ') || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  if (module === 'oficios') {
    return (
      <>
        <table className="min-w-full text-xs">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Nº / Tipo</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Status/Urgência</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Local</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {rows.map((row, idx) => (
              <tr key={row.uid || idx}>
                <td className="px-3 py-2 text-gray-800 dark:text-gray-100 whitespace-nowrap">
                  {[row.numero_oficio, row.tipo_de_demanda].filter(Boolean).join(' - ') || '-'}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {[row.status_solicitacao, row.nivel_de_urgencia].filter(Boolean).join(' / ') || '-'}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {[row.cidade, row.bairro, row.logradouro].filter(Boolean).join(' / ') || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  if (module === 'projetos_lei') {
    return (
      <>
        <table className="min-w-full text-xs">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Nº/Ano</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Título</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {rows.map((row, idx) => (
              <tr key={row.uid || idx}>
                <td className="px-3 py-2 text-gray-800 dark:text-gray-100 whitespace-nowrap">
                  {[row.numero, row.ano].filter(Boolean).join('/') || '-'}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{row.titulo || '-'}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{row.status_label || row.status || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  if (module === 'requerimentos') {
    return (
      <>
        <table className="min-w-full text-xs">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Nº / Título</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Status/Prioridade</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Solicitante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {rows.map((row, idx) => (
              <tr key={row.uid || idx}>
                <td className="px-3 py-2 text-gray-800 dark:text-gray-100 whitespace-nowrap">
                  {[row.numero, row.titulo].filter(Boolean).join(' - ') || '-'}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {[row.status, row.prioridade].filter(Boolean).join(' / ') || '-'}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{row.solicitante || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  if (module === 'emendas') {
    return (
      <>
        <table className="min-w-full text-xs">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Nº/Ano</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Status/Tipo</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {rows.map((row, idx) => (
              <tr key={row.uid || idx}>
                <td className="px-3 py-2 text-gray-800 dark:text-gray-100 whitespace-nowrap">
                  {[row.numero_emenda, row.ano].filter(Boolean).join('/') || '-'}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {[row.status, row.tipo].filter(Boolean).join(' / ') || '-'}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {row.valor_total != null
                    ? Number(row.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  if (module === 'agendamentos') {
    return (
      <>
        <table className="min-w-full text-xs">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Título</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Status/Tipo</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Início</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {rows.map((row, idx) => (
              <tr key={row.uid || idx}>
                <td className="px-3 py-2 text-gray-800 dark:text-gray-100 whitespace-nowrap">{row.title || '-'}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {[row.status, row.type].filter(Boolean).join(' / ') || '-'}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {row.start_time
                    ? new Date(row.start_time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  if (module === 'usuarios') {
    return (
      <>
        <table className="min-w-full text-xs" style={{ minWidth: '700px', width: 'max-content' }}>
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">Nome</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">Contato</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">Nível</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">Status</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">Último acesso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {rows.map((row, idx) => (
              <tr key={row.uid || idx}>
                <td className="px-3 py-2 text-gray-800 dark:text-gray-100 whitespace-nowrap">
                  <div className="font-medium whitespace-nowrap">{row.nome || '-'}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.email || '-'}</div>
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{row.contato || '-'}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{row.nivel_acesso || '-'}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{row.status || '-'}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{row.ultimo_acesso || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  return null;
}

function renderMessage(text: string) {
  const regex = /(\*\*[^*]+\*\*|_[^_]+_|\n)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token === '\n') {
      parts.push(<br key={match.index} />);
    } else if (token.startsWith('**')) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('_')) {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
