import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Plus, Clock, Calendar, MessageSquare, Bell, CheckCircle as CheckCircleIcon, Circle as CircleIcon } from 'lucide-react';
import { supabaseClient } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useCompanyStore } from '../store/useCompanyStore';

interface Observacao {
  uid: string;
  atendimento_uid: string;
  observacao: string;
  created_at: string;
  responsavel: string | null;
  empresa_uid: string;
}

interface Lembrete {
  uid: string;
  atendimento_uid: string;
  descricao: string;
  data_lembrete: string;
  created_at: string;
  usuario_uid: string;
  status: 'pendente' | 'concluido';
}

interface AtendimentoFocusProps {
  isOpen: boolean;
  onClose: () => void;
  atendimento: any;
}

export default function AtendimentoFocus({ isOpen, onClose, atendimento }: AtendimentoFocusProps) {
  console.log('AtendimentoFocus renderizado:', { isOpen, atendimento });

  const queryClient = useQueryClient();
  const [novaObservacao, setNovaObservacao] = useState('');
  const [novoLembrete, setNovoLembrete] = useState({
    descricao: '',
    data_lembrete: ''
  });
  const [observacoes, setObservacoes] = useState<Observacao[]>([]);
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [activeTab, setActiveTab] = useState<'observacoes' | 'lembretes'>('observacoes');

  const company = useCompanyStore((state) => state.company);
  const user = useCompanyStore((state) => state.user);

  // Carregar observações e lembretes ao abrir o modal
  React.useEffect(() => {
    console.log('useEffect AtendimentoFocus:', { isOpen, atendimentoUid: atendimento?.uid });
    if (isOpen && atendimento?.uid) {
      loadObservacoes();
      loadLembretes();
    }
  }, [isOpen, atendimento?.uid]);

  const loadObservacoes = async () => {
    const { data, error } = await supabaseClient
      .from('gbp_observacoes')
      .select('*')
      .eq('atendimento_uid', atendimento.uid)
      .eq('empresa_uid', company?.uid)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar observações');
      return;
    }

    setObservacoes(data || []);
  };

  const loadLembretes = async () => {
    const { data, error } = await supabaseClient
      .from('gbp_lembretes')
      .select('*')
      .eq('atendimento_uid', atendimento.uid)
      .order('data_lembrete', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar lembretes');
      return;
    }

    setLembretes(data || []);
  };

  const handleAddObservacao = async () => {
    if (!novaObservacao.trim() || !company?.uid || !user?.uid) return;

    const { error } = await supabaseClient
      .from('gbp_observacoes')
      .insert([{
        atendimento_uid: atendimento.uid,
        observacao: novaObservacao,
        created_at: new Date().toISOString(),
        responsavel: user.uid,
        empresa_uid: company.uid
      }]);

    if (error) {
      toast.error('Erro ao adicionar observação');
      return;
    }

    toast.success('Observação adicionada com sucesso');
    setNovaObservacao('');
    loadObservacoes();
    queryClient.invalidateQueries({ queryKey: ['atendimentos', company.uid] });
  };

  const handleAddLembrete = async () => {
    if (!novoLembrete.descricao.trim() || !novoLembrete.data_lembrete) return;

    const { error } = await supabaseClient
      .from('gbp_lembretes')
      .insert([{
        atendimento_uid: atendimento.uid,
        descricao: novoLembrete.descricao,
        data_lembrete: novoLembrete.data_lembrete,
        created_at: new Date().toISOString(),
        usuario_uid: atendimento.usuario_uid,
        status: 'pendente'
      }]);

    if (error) {
      toast.error('Erro ao adicionar lembrete');
      return;
    }

    toast.success('Lembrete adicionado com sucesso');
    setNovoLembrete({ descricao: '', data_lembrete: '' });
    loadLembretes();
  };

  const handleToggleLembreteStatus = async (lembrete: Lembrete) => {
    const novoStatus = lembrete.status === 'pendente' ? 'concluido' : 'pendente';

    const { error } = await supabaseClient
      .from('gbp_lembretes')
      .update({ status: novoStatus })
      .eq('uid', lembrete.uid);

    if (error) {
      toast.error('Erro ao atualizar status do lembrete');
      return;
    }

    loadLembretes();
  };

  return (
    <Transition.Root show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <span className="sr-only">Fechar</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Cabeçalho */}
                <div className="mb-6">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900 dark:text-white">
                    Detalhes do Atendimento
                  </Dialog.Title>
                  <div className="mt-2 space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <p>
                      <span className="font-medium">Eleitor:</span> {atendimento?.gbp_eleitores?.nome || 'N/A'}
                    </p>
                    <p>
                      <span className="font-medium">Data:</span> {format(new Date(atendimento?.data_atendimento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <p>
                      <span className="font-medium">Categoria:</span> {atendimento?.gbp_categorias?.nome || 'N/A'}
                    </p>
                    <p>
                      <span className="font-medium">Descrição:</span> {atendimento?.descricao || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                      onClick={() => setActiveTab('observacoes')}
                      className={`${
                        activeTab === 'observacoes'
                          ? 'border-primary-500 text-primary-600 dark:text-primary-500'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Observações
                    </button>
                    <button
                      onClick={() => setActiveTab('lembretes')}
                      className={`${
                        activeTab === 'lembretes'
                          ? 'border-primary-500 text-primary-600 dark:text-primary-500'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Lembretes
                    </button>
                  </nav>
                </div>

                {/* Conteúdo das Tabs */}
                <div className="mt-4">
                  {activeTab === 'observacoes' ? (
                    <div>
                      {/* Formulário de nova observação */}
                      <div className="mb-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={novaObservacao}
                            onChange={(e) => setNovaObservacao(e.target.value)}
                            placeholder="Digite uma observação..."
                            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                          <button
                            onClick={handleAddObservacao}
                            className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar
                          </button>
                        </div>
                      </div>

                      {/* Lista de observações */}
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {observacoes.map((obs) => (
                          <div
                            key={obs.uid}
                            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                          >
                            <p className="text-sm text-gray-900 dark:text-white">{obs.observacao}</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {format(new Date(obs.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Formulário de novo lembrete */}
                      <div className="mb-4 space-y-2">
                        <input
                          type="text"
                          value={novoLembrete.descricao}
                          onChange={(e) => setNovoLembrete({ ...novoLembrete, descricao: e.target.value })}
                          placeholder="Descrição do lembrete..."
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                        />
                        <div className="flex gap-2">
                          <input
                            type="datetime-local"
                            value={novoLembrete.data_lembrete}
                            onChange={(e) => setNovoLembrete({ ...novoLembrete, data_lembrete: e.target.value })}
                            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                          <button
                            onClick={handleAddLembrete}
                            className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar
                          </button>
                        </div>
                      </div>

                      {/* Lista de lembretes */}
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {lembretes.map((lembrete) => (
                          <div
                            key={lembrete.uid}
                            className={`${
                              lembrete.status === 'concluido'
                                ? 'bg-green-50 dark:bg-green-900/20'
                                : 'bg-gray-50 dark:bg-gray-700'
                            } rounded-lg p-4`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm text-gray-900 dark:text-white">{lembrete.descricao}</p>
                                <div className="mt-1 flex items-center space-x-4">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {format(new Date(lembrete.data_lembrete), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {format(new Date(lembrete.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleToggleLembreteStatus(lembrete)}
                                className={`${
                                  lembrete.status === 'concluido'
                                    ? 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'
                                    : 'text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200'
                                } p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600`}
                              >
                                <span className="sr-only">
                                  {lembrete.status === 'concluido' ? 'Marcar como pendente' : 'Marcar como concluído'}
                                </span>
                                {lembrete.status === 'concluido' ? (
                                  <CheckCircleIcon className="w-5 h-5" />
                                ) : (
                                  <CircleIcon className="w-5 h-5" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 