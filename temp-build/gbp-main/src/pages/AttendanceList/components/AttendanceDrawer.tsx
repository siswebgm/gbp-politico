import React, { useState, useEffect } from 'react';
import { X, Send, Bell, Calendar, Clock, AlertCircle, MessageCircle, Trash2, MessageSquare, CheckCircle, XCircle, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabaseClient } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as Dialog from '@radix-ui/react-dialog';

interface Observation {
  uid: string;
  atendimento_uid: string;
  observacao: string;
  created_at: string;
  responsavel: string | null;
  empresa_uid: string | null;
  lembrete?: boolean;
  responsavel_usuario?: {
    nome: string;
    email: string;
  };
}

interface Reminder {
  reminders_uid: number;
  uid: string;
  atendimento_uid: string;
  empresa_uid: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

interface Atendimento {
  uid: string;
  eleitor_uid: string;
  usuario_uid: string;
  categoria_uid: string;
  descricao: string;
  data_atendimento: string;
  empresa_uid: string;
  status: string;
  responsavel: string;
  created_at: string;
  gbp_eleitores?: {
    nome: string;
    zona: string;
  };
  categoria?: {
    nome: string;
  };
  gbp_usuarios?: {
    nome: string;
  };
}

interface User {
  id: string;
  nome: string | null;
  email: string;
  empresa_uid: string;
  role: 'admin' | 'attendant';
}

interface Company {
  uid: string;
  nome: string;
  token: string;
  instancia: string;
  porta: string;
}

interface ObservationFormData {
  observacao: string;
}

interface ReminderFormData {
  title: string;
  description: string;
  due_date: string;
  due_time: string;
  priority: 'low' | 'medium' | 'high';
}

const priorityConfig = {
  low: {
    label: 'Baixa',
    color: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400'
  },
  medium: {
    label: 'Média',
    color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400'
  },
  high: {
    label: 'Alta',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400'
  }
};

const statusConfig = {
  'Pendente': {
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    icon: Clock,
  },
  'Em Andamento': {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    icon: AlertCircle,
  },
  'Concluído': {
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    icon: CheckCircle,
  },
  'Cancelado': {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    icon: XCircle,
  },
};

export function AttendanceDrawer({ isOpen, onClose, atendimento: initialAtendimento }: { isOpen: boolean; onClose: () => void; atendimento: Atendimento }) {
  const { user } = useAuthStore();
  const company = useCompanyStore((state) => state.company);
  const queryClient = useQueryClient();
  const [atendimento, setAtendimento] = useState<Atendimento>(initialAtendimento);
  const [newObservation, setNewObservation] = useState('');
  const [observations, setObservations] = useState<Observation[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'observation' | 'reminder'; id: string } | null>(null);
  const [editingCategory, setEditingCategory] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [categories, setCategories] = useState<Array<{ uid: string; nome: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState(initialAtendimento?.categoria_uid || '');
  const [descriptionText, setDescriptionText] = useState(initialAtendimento?.descricao || '');

  useEffect(() => {
    if (!user || !company) {
      console.warn('Usuário ou empresa não encontrados');
      return;
    }

    console.log('Estado atual:', {
      user,
      company,
      atendimento
    });
  }, [user, company, atendimento]);

  useEffect(() => {
    console.log('=== Debug - Estado do AttendanceDrawer ===');
    console.log('User:', user);
    console.log('Company:', company);
    console.log('Atendimento:', atendimento);
    console.log('IsOpen:', isOpen);
    console.log('====================================');
  }, [user, company, atendimento, isOpen]);

  useEffect(() => {
    if (initialAtendimento && isOpen) {
      setAtendimento(initialAtendimento);
    }
  }, [initialAtendimento, isOpen]);

  useEffect(() => {
    if (atendimento?.uid && isOpen) {
      loadObservations();
      loadReminders();
    }
  }, [atendimento?.uid, isOpen]);

  useEffect(() => {
    if (!user) {
      console.log('Usuário não encontrado no storage');
      toast.error('Sessão expirada. Por favor, faça login novamente.');
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      console.log('Usuário não encontrado');
      toast.error('Sessão expirada. Por favor, faça login novamente.');
      return;
    }
  }, [user]);

  useEffect(() => {
    if (!company?.uid || !atendimento?.uid || !isOpen) {
      console.log('Debug - Dados necessários não disponíveis:', { 
        companyUid: company?.uid,
        atendimentoUid: atendimento?.uid,
        isOpen
      });
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          loadObservations(),
          loadReminders(),
          loadEleitorAndCategoria()
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Não foi possível carregar alguns dados do atendimento');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [company?.uid, atendimento?.uid, isOpen]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data: categoriesData } = await supabaseClient
        .from('gbp_categorias')
        .select('uid, nome')
        .eq('empresa_uid', atendimento?.empresa_uid)
        .order('nome');
      
      if (categoriesData) {
        setCategories(categoriesData);
      }
    };
    
    fetchCategories();
  }, [atendimento?.empresa_uid]);

  const handleUpdateCategory = async () => {
    try {
      const { error } = await supabaseClient
        .from('gbp_atendimentos')
        .update({ categoria_uid: selectedCategory })
        .eq('uid', atendimento.uid);

      if (error) throw error;

      // Encontra a categoria selecionada
      const selectedCategoryData = categories.find(cat => cat.uid === selectedCategory);

      // Atualiza o estado local imediatamente
      setAtendimento(prev => ({
        ...prev,
        categoria_uid: selectedCategory,
        categoria: selectedCategoryData ? {
          uid: selectedCategoryData.uid,
          nome: selectedCategoryData.nome
        } : prev.categoria
      }));

      setEditingCategory(false);
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
    }
  };

  const handleUpdateDescription = async () => {
    try {
      const { error } = await supabaseClient
        .from('gbp_atendimentos')
        .update({ descricao: descriptionText })
        .eq('uid', atendimento.uid);

      if (error) throw error;

      // Atualiza o estado local imediatamente com a nova descrição
      setAtendimento(prev => ({
        ...prev,
        descricao: descriptionText
      }));

      setEditingDescription(false);
    } catch (error) {
      console.error('Erro ao atualizar descrição:', error);
    }
  };

  useEffect(() => {
    if (!isOpen || !atendimento?.uid) return;

    fetchData();

    // Subscription para observações
    const observationsSubscription = supabaseClient
      .channel('observacoes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gbp_observacoes',
          filter: `atendimento_uid=eq.${atendimento.uid}`
        },
        (payload) => {
          console.log('Mudança nas observações:', payload);
          fetchData(); // Recarrega os dados quando houver mudança
        }
      )
      .subscribe();

    return () => {
      observationsSubscription.unsubscribe();
    };
  }, [isOpen, atendimento?.uid]);

  const fetchData = async () => {
    if (!atendimento?.uid) return;
    
    try {
      const { data: observacoesData, error: observacoesError } = await supabaseClient
        .from('gbp_observacoes')
        .select('*')
        .eq('atendimento_uid', atendimento.uid)
        .order('created_at', { ascending: true });

      if (observacoesError) throw observacoesError;
      setObservations(observacoesData || []);

      const { data: lembreteData, error: lembreteError } = await supabaseClient
        .from('gbp_lembretes')
        .select('*')
        .eq('atendimento_uid', atendimento.uid)
        .order('created_at', { ascending: true });

      if (lembreteError) throw lembreteError;
      setReminders(lembreteData || []);

      // Carregar categorias
      const { data: categoriasData, error: categoriasError } = await supabaseClient
        .from('gbp_categorias')
        .select('uid,nome')
        .eq('empresa_uid', company?.uid)
        .order('nome', { ascending: true });

      if (categoriasError) throw categoriasError;
      setCategories(categoriasData || []);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const loadObservations = async () => {
    try {
      if (!atendimento?.uid) {
        console.error('Atendimento não encontrado ao carregar observações');
        return;
      }

      const { data: observationsData, error: observationsError } = await supabaseClient
        .from('gbp_observacoes')
        .select(`
          *,
          responsavel_usuario:responsavel(
            nome,
            email
          )
        `)
        .eq('atendimento_uid', atendimento.uid)
        .order('created_at', { ascending: false });

      if (observationsError) {
        console.error('Erro ao carregar observações:', observationsError);
        throw observationsError;
      }

      setObservations(observationsData || []);
    } catch (error) {
      console.error('Erro ao carregar observações:', error);
      toast.error('Erro ao carregar observações');
    }
  };

  const loadReminders = async () => {
    if (!atendimento?.uid || !company?.uid) {
      console.log('Debug - Dados necessários não disponíveis para lembretes:', { 
        atendimentoUid: atendimento?.uid,
        companyUid: company?.uid 
      });
      return;
    }

    try {
      console.log('Debug - Carregando lembretes para:', {
        atendimentoUid: atendimento.uid,
        companyUid: company.uid
      });

      const { data, error } = await supabaseClient
        .from('gbp_lembretes')
        .select('*')
        .eq('atendimento_uid', atendimento.uid)
        .eq('empresa_uid', company.uid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro detalhado ao carregar lembretes:', error);
        throw error;
      }

      console.log('Debug - Lembretes carregados:', data?.length || 0);
      setReminders(data || []);
    } catch (error) {
      console.error('Erro ao carregar lembretes:', error);
      toast.error('Não foi possível carregar os lembretes');
    }
  };

  const loadEleitorAndCategoria = async () => {
    if (!atendimento?.uid || !company?.uid) {
      console.log('Debug - Dados necessários não disponíveis para eleitor e categoria:', { 
        atendimentoUid: atendimento?.uid,
        companyUid: company?.uid 
      });
      return;
    }

    try {
      const updates: Partial<Atendimento> = {};

      // Buscar dados do eleitor
      if (atendimento.eleitor_uid) {
        const { data: eleitor, error: eleitorError } = await supabaseClient
          .from('gbp_eleitores')
          .select('nome, zona')
          .eq('uid', atendimento.eleitor_uid)
          .single();

        if (eleitorError) throw eleitorError;

        if (eleitor) {
          updates.gbp_eleitores = {
            nome: eleitor.nome,
            zona: eleitor.zona
          };
        }
      }

      // Buscar dados da categoria
      if (atendimento.categoria_uid) {
        const { data: categoria, error: categoriaError } = await supabaseClient
          .from('gbp_categorias')
          .select('nome')
          .eq('uid', atendimento.categoria_uid)
          .single();

        if (categoriaError) throw categoriaError;

        if (categoria) {
          updates.categoria = {
            nome: categoria.nome
          };
        }
      }

      // Buscar dados do responsável
      if (atendimento.usuario_uid) {
        const { data: usuario, error: usuarioError } = await supabaseClient
          .from('gbp_usuarios')
          .select('nome')
          .eq('uid', atendimento.usuario_uid)
          .single();

        if (usuarioError) throw usuarioError;

        if (usuario) {
          updates.gbp_usuarios = {
            nome: usuario.nome
          };
        }
      }

      // Atualizar o estado apenas uma vez com todas as mudanças
      if (Object.keys(updates).length > 0) {
        setAtendimento(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      console.error('Erro ao carregar dados relacionados:', error);
      toast.error('Não foi possível carregar alguns dados do atendimento');
    }
  };

  const handleSubmitObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!newObservation.trim()) {
        return;
      }

      if (!atendimento?.uid) {
        console.error('Atendimento não encontrado');
        toast.error('Erro ao salvar observação: Atendimento não encontrado');
        return;
      }

      if (!user) {
        console.error('Usuário não autenticado:', {
          user
        });
        toast.error('Erro ao salvar observação: Usuário não autenticado');
        return;
      }

      // Verifica se o user.uid existe, senão usa o user.id convertido para string
      const responsavelUid = user.uid || String(user.id);

      const { error: observacaoError } = await supabaseClient
        .from('gbp_observacoes')
        .insert({
          atendimento_uid: atendimento.uid,
          observacao: newObservation.trim(),
          responsavel: responsavelUid,
          empresa_uid: atendimento.empresa_uid,
          created_at: new Date().toISOString()
        });

      if (observacaoError) {
        console.error('Erro detalhado ao salvar observação:', {
          error: observacaoError,
          payload: {
            atendimento_uid: atendimento.uid,
            empresa_uid: atendimento.empresa_uid,
            responsavel: responsavelUid,
            observacao: newObservation.trim()
          }
        });
        throw observacaoError;
      }

      setNewObservation('');
      await loadObservations();
      toast.success('Observação salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar observação:', error);
      toast.error('Erro ao salvar observação');
    }
  };

  const onSubmitReminder = async (data: any) => {
    try {
      // Verifica se o user.uid existe, senão usa o user.id convertido para string
      const userUid = user?.uid || String(user?.id);

      const { error: reminderError } = await supabaseClient
        .from('gbp_lembretes')
        .insert({
          atendimento_uid: atendimento.uid,
          empresa_uid: atendimento.empresa_uid,
          title: data.titulo,
          description: data.descricao,
          due_date: `${data.data_lembrete}T${data.hora_lembrete}:00-03:00`,
          priority: data.prioridade || 'medium',
          status: 'pending',
          created_by: userUid,
          updated_by: userUid,
        });

      if (reminderError) {
        console.error('Erro ao criar lembrete:', {
          error: reminderError,
          payload: {
            atendimento_uid: atendimento.uid,
            empresa_uid: atendimento.empresa_uid,
            title: data.titulo,
            description: data.descricao,
            due_date: `${data.data_lembrete}T${data.hora_lembrete}:00-03:00`,
            priority: data.prioridade || 'medium',
            status: 'pending',
            created_by: userUid,
            updated_by: userUid,
          }
        });
        throw reminderError;
      }

      setShowReminderForm(false);
      loadReminders();
      loadObservations();
      toast.success('Lembrete criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar lembrete:', error);
      toast.error('Erro ao criar lembrete');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete || !user) return;

    setIsLoading(true);

    try {
      const { error } = await supabaseClient
        .from(itemToDelete.type === 'observation' ? 'gbp_observacoes' : 'gbp_lembretes')
        .delete()
        .eq('uid', itemToDelete.id);

      if (error) throw error;

      toast('Observação excluída com sucesso');
      
      if (itemToDelete.type === 'observation') {
        loadObservations();
      } else {
        loadReminders();
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error(`Não foi possível excluir o ${itemToDelete.type === 'observation' ? 'observação' : 'lembrete'}`);
    } finally {
      setIsLoading(false);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  useEffect(() => {
    if (atendimento?.uid) {
      loadObservations();
      loadReminders();
    }
  }, [atendimento?.uid]);

  if (!atendimento || !isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full justify-end">
        <div className="w-screen max-w-md">
          <div className="flex h-full flex-col divide-y divide-gray-200 bg-white shadow-xl">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-scroll py-6">
              <div className="px-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Detalhes do Atendimento</h2>
                  <div className="ml-3 flex h-7 items-center">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onClick={onClose}
                    >
                      <span className="sr-only">Fechar</span>
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="relative mt-6 flex-1 px-4 sm:px-6">
                <div className="space-y-6">
                  {/* Informações do atendimento */}
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5">
                      {/* Nome do eleitor em destaque */}
                      <div className="mb-6">
                        <span className="block text-sm font-medium text-gray-500 mb-1">Eleitor</span>
                        <h4 className="text-xl font-bold text-gray-900">
                          {atendimento.gbp_eleitores?.nome || '-'}
                        </h4>
                      </div>

                      {/* Categoria */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="block text-base font-medium text-gray-700">Categoria</span>
                          {!editingCategory && (
                            <button
                              onClick={() => {
                                setEditingCategory(true);
                                setSelectedCategory(atendimento.categoria_uid);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                              title="Editar categoria"
                            >
                              <Edit2 className="h-4 w-4" />
                              <span className="text-sm">Editar</span>
                            </button>
                          )}
                        </div>
                        {editingCategory ? (
                          <div className="mt-2 bg-white rounded-lg border border-blue-200 p-3 shadow-sm">
                            <select
                              value={selectedCategory}
                              onChange={(e) => setSelectedCategory(e.target.value)}
                              className="block w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 pl-2 pr-10 text-gray-900 bg-white shadow-sm"
                              style={{ fontSize: '1rem' }}
                            >
                              <option value="">Selecione uma categoria</option>
                              {categories.map((cat) => (
                                <option key={cat.uid} value={cat.uid} className="py-2 pl-1">
                                  {cat.nome}
                                </option>
                              ))}
                            </select>
                            <div className="mt-3 flex justify-end space-x-2">
                              <button
                                onClick={() => setEditingCategory(false)}
                                className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300"
                              >
                                <XCircle className="h-4 w-4" />
                                <span>Cancelar</span>
                              </button>
                              <button
                                onClick={handleUpdateCategory}
                                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                                <span>Salvar</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg px-4 py-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 truncate max-w-[200px]">
                              {atendimento.categoria?.nome || '-'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <div className="mb-4">
                        <span className="block text-sm font-medium text-gray-500">Status</span>
                        <span className={`mt-1 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig[atendimento.status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'}`}>
                          {atendimento.status || '-'}
                        </span>
                      </div>

                      {/* Data e Hora */}
                      <div className="mb-4">
                        <span className="block text-sm font-medium text-gray-500">Data e Hora</span>
                        <span className="mt-1 inline-flex items-center text-base font-semibold text-gray-900 whitespace-nowrap">
                          <Calendar className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                          {format(new Date(atendimento.data_atendimento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>

                      {/* Responsável */}
                      <div className="mb-4">
                        <span className="block text-sm font-medium text-gray-500">Responsável</span>
                        <span className="mt-1 inline-flex items-center text-sm text-gray-900">
                          {atendimento.gbp_usuarios?.nome || 'N/A'}
                        </span>
                      </div>

                      {/* Descrição */}
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="block text-base font-medium text-gray-700">Descrição</span>
                          {!editingDescription && (
                            <button
                              onClick={() => {
                                setEditingDescription(true);
                                setDescriptionText(atendimento.descricao);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                              title="Editar descrição"
                            >
                              <Edit2 className="h-4 w-4" />
                              <span className="text-sm">Editar</span>
                            </button>
                          )}
                        </div>
                        {editingDescription ? (
                          <div className="mt-2 bg-white rounded-lg border border-blue-200 p-3 shadow-sm">
                            <textarea
                              value={descriptionText}
                              onChange={(e) => setDescriptionText(e.target.value)}
                              className="block w-full resize-none border border-gray-300 bg-white py-2 px-4 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg sm:text-sm sm:leading-6"
                              rows={4}
                              placeholder="Digite a descrição do atendimento..."
                              style={{ resize: 'vertical' }}
                            />
                            <div className="mt-3 flex justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setEditingDescription(false);
                                  setDescriptionText(atendimento.descricao);
                                }}
                                className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300"
                              >
                                <XCircle className="h-4 w-4" />
                                <span>Cancelar</span>
                              </button>
                              <button
                                onClick={handleUpdateDescription}
                                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                                <span>Salvar</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg px-4 py-3 relative group">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {atendimento.descricao || 'Nenhuma descrição fornecida.'}
                            </p>
                            <div className="absolute inset-0 bg-gray-900/0 group-hover:bg-gray-900/5 transition-colors rounded-lg" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Observações */}
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="h-5 w-5 text-gray-400" />
                          <h3 className="text-lg font-medium text-gray-900">Observações</h3>
                        </div>
                        <div className="text-sm text-gray-500">
                          {observations.filter(obs => !obs.lembrete).length} {observations.filter(obs => !obs.lembrete).length === 1 ? 'observação' : 'observações'}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Formulário de observação */}
                        <div className="mt-4">
                          <form onSubmit={handleSubmitObservation} className="relative">
                            <div className="overflow-hidden rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2">
                              <div className="relative">
                                <textarea
                                  rows={2}
                                  name="observacao"
                                  value={newObservation}
                                  onChange={(e) => setNewObservation(e.target.value)}
                                  className="block w-full resize-none border border-gray-300 bg-white py-2 pl-14 pr-12 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg sm:text-sm sm:leading-6"
                                  placeholder="Digite uma observação..."
                                />
                                <div className="absolute left-0 top-0 bottom-0 flex w-12 items-center justify-center">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                    <MessageSquare className="h-4 w-4" />
                                  </div>
                                </div>
                                <div className="absolute right-0 bottom-0 flex py-2 pl-3 pr-2">
                                  <button
                                    type="submit"
                                    disabled={!newObservation.trim()}
                                    className="inline-flex items-center justify-center rounded-lg bg-blue-500 p-2 text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                  >
                                    <Send className="h-4 w-4 -rotate-45" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </form>

                          {/* Lista de observações */}
                          <div className="mt-6 space-y-4">
                            {observations.map((observation) => (
                              <div
                                key={observation.uid}
                                className="group relative flex gap-x-4"
                              >
                                <div className="flex-auto rounded-md p-3 ring-1 ring-inset ring-gray-200">
                                  <div className="flex justify-between gap-x-4">
                                    <div className="py-0.5 text-xs leading-5 text-gray-500">
                                      <span className="font-medium text-gray-900">
                                        {observation.responsavel_usuario?.nome || 'Usuário'}
                                      </span>{' '}
                                      comentou
                                    </div>
                                    <button
                                      onClick={() => {
                                        setItemToDelete({ type: 'observation', id: observation.uid });
                                        setDeleteModalOpen(true);
                                      }}
                                      className="text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                  <div className="flex justify-between items-start mt-2">
                                    <p className="text-sm leading-6 text-gray-500 flex-1">
                                      {observation.observacao}
                                    </p>
                                    <time
                                      dateTime={observation.created_at}
                                      className="text-xs leading-5 text-gray-500 ml-4 whitespace-nowrap"
                                    >
                                      {format(new Date(observation.created_at), "dd/MM/yyyy 'às' HH:mm", {
                                        locale: ptBR,
                                      })}
                                    </time>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {observations.length === 0 && (
                              <p className="text-center text-sm text-gray-500 py-4">
                                Nenhuma observação registrada
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lembretes */}
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <Bell className="h-5 w-5 text-gray-400" />
                          <h3 className="text-lg font-medium text-gray-900">Lembretes</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowReminderForm(!showReminderForm)}
                          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                        >
                          {showReminderForm ? (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Cancelar
                            </>
                          ) : (
                            <>
                              <Bell className="h-4 w-4 mr-1" />
                              Novo Lembrete
                            </>
                          )}
                        </button>
                      </div>

                      {/* Form de Novo Lembrete */}
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showReminderForm ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="space-y-4 bg-gray-50/50 rounded-lg p-4 border border-gray-100">
                          <div>
                            <label htmlFor="titulo" className="block text-sm font-medium text-gray-600">
                              Título
                            </label>
                            <input
                              type="text"
                              id="titulo"
                              className="mt-1.5 block w-full h-11 rounded-lg border-gray-200 bg-white px-3.5 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:text-sm"
                              placeholder="Ex: Retornar ligação"
                            />
                          </div>

                          <div>
                            <label htmlFor="descricao" className="block text-sm font-medium text-gray-600">
                              Descrição
                            </label>
                            <textarea
                              id="descricao"
                              rows={2}
                              className="mt-1.5 block w-full rounded-lg border-gray-200 bg-white px-3.5 py-2.5 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:text-sm resize-none"
                              placeholder="Detalhes do lembrete..."
                            />
                          </div>

                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label htmlFor="data_lembrete" className="block text-sm font-medium text-gray-600">
                                Data
                              </label>
                              <input
                                type="date"
                                id="data_lembrete"
                                className="mt-1.5 block w-full h-11 rounded-lg border-gray-200 bg-white px-3.5 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:text-sm"
                                min={format(new Date(), 'yyyy-MM-dd')}
                              />
                            </div>
                            <div className="flex-1">
                              <label htmlFor="hora_lembrete" className="block text-sm font-medium text-gray-600">
                                Hora
                              </label>
                              <input
                                type="time"
                                id="hora_lembrete"
                                className="mt-1.5 block w-full h-11 rounded-lg border-gray-200 bg-white px-3.5 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:text-sm"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                onSubmitReminder({
                                  titulo: (document.getElementById('titulo') as HTMLInputElement).value,
                                  descricao: (document.getElementById('descricao') as HTMLTextAreaElement).value,
                                  data_lembrete: (document.getElementById('data_lembrete') as HTMLInputElement).value,
                                  hora_lembrete: (document.getElementById('hora_lembrete') as HTMLInputElement).value,
                                });
                                setShowReminderForm(false);
                              }}
                              className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                            >
                              <Bell className="h-4 w-4 mr-2" />
                              Criar Lembrete
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Lista de Lembretes */}
                      <div className="mt-4 space-y-3">
                        {reminders.map((reminder) => {
                          const reminderDate = new Date(reminder.due_date);
                          const isExpired = reminderDate < new Date();
                          
                          return (
                            <div
                              key={reminder.uid}
                              className={`group relative flex gap-x-4 ${isExpired ? 'opacity-75' : ''}`}
                            >
                              <div className={`flex-auto rounded-md p-3 ring-1 ring-inset ${
                                isExpired ? 'ring-red-200 bg-red-50' : 'ring-gray-200'
                              }`}>
                                <div className="flex justify-between gap-x-4">
                                  <div className="py-0.5 text-xs leading-5 text-gray-500">
                                    <span className={`font-medium ${
                                      isExpired ? 'text-red-900' : 'text-gray-900'
                                    }`}>
                                      {reminder.title}
                                    </span>
                                    {isExpired && (
                                      <span className="ml-2 inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                                        Vencido
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => {
                                      setItemToDelete({ type: 'reminder', id: reminder.uid });
                                      setDeleteModalOpen(true);
                                    }}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="flex justify-between items-start mt-2">
                                  <p className={`text-sm leading-6 flex-1 ${
                                    isExpired ? 'text-red-700' : 'text-gray-500'
                                  }`}>
                                    {reminder.description || 'Sem descrição'}
                                  </p>
                                  <time
                                    dateTime={reminder.due_date}
                                    className={`text-xs leading-5 ml-4 whitespace-nowrap flex items-center ${
                                      isExpired ? 'text-red-700' : 'text-gray-500'
                                    }`}
                                  >
                                    <Clock className={`h-3.5 w-3.5 mr-1 ${
                                      isExpired ? 'text-red-700' : 'text-gray-400'
                                    }`} />
                                    {format(reminderDate, "dd/MM/yyyy 'às' HH:mm", {
                                      locale: ptBR,
                                    })}
                                  </time>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {reminders.length === 0 && (
                          <p className="text-center text-sm text-gray-500 py-4">
                            Nenhum lembrete registrado
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      {deleteModalOpen && (
        <Dialog.Root open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 p-8">
              <div className="relative">
                {/* Botão de fechar */}
                <Dialog.Close className="absolute right-0 top-0 p-2 text-gray-400 hover:text-gray-500">
                  <X className="h-5 w-5" />
                </Dialog.Close>

                <div className="flex flex-col items-center text-center">
                  {/* Ícone de alerta */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>

                  {/* Título */}
                  <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">
                    Excluir {itemToDelete?.type === 'observation' ? 'observação' : 'lembrete'}
                  </Dialog.Title>

                  {/* Descrição */}
                  <Dialog.Description className="text-sm text-gray-500 mb-6">
                    Tem certeza que deseja excluir {itemToDelete?.type === 'observation' ? 'esta observação' : 'este lembrete'}? 
                    Esta ação não pode ser desfeita.
                  </Dialog.Description>

                  {/* Botões */}
                  <div className="flex gap-3 w-full">
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="flex-1 justify-center inline-flex items-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancelar
                      </button>
                    </Dialog.Close>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="flex-1 justify-center inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Excluindo...
                        </>
                      ) : (
                        'Excluir'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}