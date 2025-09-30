import React, { useState } from 'react';
import { Edit2, Trash2, Plus, Loader2, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, MapPin, Building2, Phone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { supabaseClient } from '../../../lib/supabase';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../components/ui/alert-dialog";
import { useToast } from '../../../hooks/useToast';
import { Card } from '../../../components/Card';
import { Label } from '../../../components/ui/label';

const ITEMS_PER_PAGE = 8;

interface IndicadoFormData {
  nome: string;
  cidade: string;
  bairro: string;
  whatsapp?: string;
}

const indicadoSchema = z.object({
  nome: z.string().min(1, 'O nome é obrigatório'),
  cidade: z.string().min(1, 'A cidade é obrigatória'),
  bairro: z.string().min(1, 'O bairro é obrigatório'),
  whatsapp: z.string().optional(),
});

type Indicado = {
  uid: string;
  nome: string;
  cidade: string;
  bairro: string;
  whatsapp?: string;
  created_at: string;
};

export function IndicadoSettings() {
  const company = useCompanyStore(state => state.company);
  const toast = useToast();
  const [indicados, setIndicados] = useState<Indicado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIndicado, setEditingIndicado] = useState<Indicado | null>(null);
  const [deletingIndicado, setDeletingIndicado] = useState<Indicado | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting: isSubmittingForm },
  } = useForm<IndicadoFormData>({
    resolver: zodResolver(indicadoSchema),
  });

  // Função para ordenar indicados
  const sortIndicados = (items: Indicado[]) => {
    return [...items].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  };

  // Carregar indicados
  React.useEffect(() => {
    async function loadIndicados() {
      if (!company?.uid) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabaseClient
          .from('gbp_indicado')
          .select('*')
          .eq('empresa_uid', company.uid);

        if (error) throw error;
        setIndicados(sortIndicados(data || []));
      } catch (error) {
        console.error('Erro ao carregar indicados:', error);
        toast.showToast({
          type: 'error',
          title: 'Erro',
          description: 'Não foi possível carregar os indicados'
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadIndicados();
  }, [company?.uid]);

  // Filtragem e ordenação dos indicados
  const filteredIndicados = React.useMemo(() => {
    let filtered = indicados;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (indicado) =>
          (indicado.nome?.toLowerCase() || '').includes(searchLower) ||
          (indicado.cidade?.toLowerCase() || '').includes(searchLower) ||
          (indicado.bairro?.toLowerCase() || '').includes(searchLower) ||
          (indicado.whatsapp?.toLowerCase() || '').includes(searchLower)
      );
    }

    return sortIndicados(filtered);
  }, [indicados, searchTerm]);

  // Paginação
  const totalPages = Math.ceil(filteredIndicados.length / ITEMS_PER_PAGE);
  const paginatedIndicados = filteredIndicados.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Função para capitalizar a primeira letra de cada palavra
  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Função para formatar número de WhatsApp
  const formatWhatsApp = (value: string) => {
    // Remove tudo que não for número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara (XX) XXXXX-XXXX
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return numbers.slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  // Criar/Editar indicado
  const onSubmit = async (data: IndicadoFormData) => {
    if (!company?.uid) return;

    try {
      setIsSubmitting(true);
      
      // Formata os campos com iniciais maiúsculas
      const formattedData = {
        ...data,
        nome: toTitleCase(data.nome),
        cidade: toTitleCase(data.cidade),
        bairro: toTitleCase(data.bairro)
      };

      if (editingIndicado) {
        const { error } = await supabaseClient
          .from('gbp_indicado')
          .update(formattedData)
          .eq('uid', editingIndicado.uid);

        if (error) throw error;

        toast.showToast({
          type: 'success',
          title: 'Sucesso',
          description: 'Indicado atualizado com sucesso'
        });

        setIndicados(prev => prev.map(ind => 
          ind.uid === editingIndicado.uid 
            ? { ...ind, ...formattedData }
            : ind
        ));
      } else {
        const { data: newIndicado, error } = await supabaseClient
          .from('gbp_indicado')
          .insert([{
            ...formattedData,
            empresa_uid: company.uid
          }])
          .select()
          .single();

        if (error) throw error;

        toast.showToast({
          type: 'success',
          title: 'Sucesso',
          description: 'Indicado criado com sucesso'
        });

        setIndicados(prev => [newIndicado, ...prev]);
      }

      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar indicado:', error);
      toast.showToast({
        type: 'error',
        title: 'Erro',
        description: 'Não foi possível salvar o indicado'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Excluir indicado
  const handleDelete = async () => {
    if (!deletingIndicado) return;

    try {
      const { error } = await supabaseClient
        .from('gbp_indicado')
        .delete()
        .eq('uid', deletingIndicado.uid);

      if (error) throw error;

      toast.showToast({
        type: 'success',
        title: 'Sucesso',
        description: 'Indicado excluído com sucesso'
      });

      setIndicados(prev => prev.filter(ind => ind.uid !== deletingIndicado.uid));
      setShowDeleteDialog(false);
      setDeletingIndicado(null);
    } catch (error) {
      console.error('Erro ao excluir indicado:', error);
      toast.showToast({
        type: 'error',
        title: 'Erro',
        description: 'Não foi possível excluir o indicado'
      });
    }
  };

  // Função para abrir o modal de novo indicado
  const handleNewIndicado = () => {
    reset({
      nome: '',
      cidade: '',
      bairro: '',
      whatsapp: ''
    });
    setEditingIndicado(null);
    setShowModal(true);
  };

  // Função para editar indicado
  const handleEditIndicado = (indicado: Indicado) => {
    reset({
      nome: indicado.nome,
      cidade: indicado.cidade,
      bairro: indicado.bairro,
      whatsapp: indicado.whatsapp || ''
    });
    setEditingIndicado(indicado);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingIndicado(null);
    reset({
      nome: '',
      cidade: '',
      bairro: '',
      whatsapp: ''
    });
  };

  return (
    <div className="relative min-h-full pb-20">
      {/* Barra de pesquisa e botão desktop */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Buscar indicados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white dark:bg-gray-800"
          />
        </div>
        <Button
          onClick={() => {
            setEditingIndicado(null);
            reset();
            setShowModal(true);
          }}
          className="hidden sm:flex"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Indicado
        </Button>
      </div>

      {/* Lista de indicados */}
      {isLoading ? (
        <div className="flex flex-col flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-gray-500">Carregando indicados...</p>
        </div>
      ) : filteredIndicados.length === 0 ? (
        <div className="flex flex-col flex-1 items-center justify-center">
          <AlertCircle className="h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Nenhum indicado encontrado</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pb-6">
            {paginatedIndicados.map((indicado) => (
              <div key={indicado.uid} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{indicado.nome}</h3>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => {
                            setEditingIndicado(indicado);
                            reset(indicado);
                            setShowModal(true);
                          }}
                          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <Edit2 className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingIndicado(indicado);
                            setShowDeleteDialog(true);
                          }}
                          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-3 text-blue-600" />
                        <span className="text-sm">{indicado.cidade}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Building2 className="h-4 w-4 mr-3 text-blue-600" />
                        <span className="text-sm">{indicado.bairro}</span>
                      </div>
                      {indicado.whatsapp && (
                        <div className="flex items-center text-gray-600">
                          <Phone className="h-4 w-4 mr-3 text-green-600" />
                          <span className="text-sm">{formatWhatsApp(indicado.whatsapp)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      Cadastrado em {new Date(indicado.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginação */}
          <div className="flex justify-center items-center space-x-2 py-4 bg-white border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="hover:bg-gray-100"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 font-medium px-2">
              Página {currentPage} de {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="hover:bg-gray-100"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Botão flutuante para smartphones */}
      <Button
        onClick={() => {
          setEditingIndicado(null);
          reset();
          setShowModal(true);
        }}
        className="sm:hidden fixed right-4 bottom-4 shadow-lg rounded-full w-14 h-14 p-0 bg-primary-500 hover:bg-primary-600"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Modais */}
      <Dialog open={showModal || !!editingIndicado} onOpenChange={(open) => {
        if (!open) {
          handleCloseModal();
        }
      }}>
        <DialogContent className="max-w-[400px] p-0 overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingIndicado ? 'Editar Indicado' : 'Novo Indicado'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Preencha os dados do indicado abaixo
            </DialogDescription>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="nome" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  Nome
                  <span className="text-red-500 ml-1" aria-label="Campo obrigatório">*</span>
                </Label>
                <Input
                  id="nome"
                  placeholder="Digite o nome"
                  aria-required="true"
                  defaultValue=""
                  className={`w-full h-10 px-3 rounded-lg bg-white dark:bg-gray-900 border focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors
                    ${errors.nome ? 'border-red-300 dark:border-red-500 ring-2 ring-red-200 dark:ring-red-800' : 'border-gray-300 dark:border-gray-600'}`}
                  {...register('nome')}
                  onChange={(e) => {
                    e.target.value = toTitleCase(e.target.value);
                    register('nome').onChange(e);
                  }}
                />
                {errors.nome && (
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1.5 flex items-center bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                    <AlertCircle className="h-4 w-4 mr-1.5 flex-shrink-0" />
                    Campo obrigatório
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whatsapp" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  WhatsApp
                </Label>
                <Input
                  id="whatsapp"
                  placeholder="(00) 00000-0000"
                  defaultValue=""
                  maxLength={15}
                  className="w-full h-10 px-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                  {...register('whatsapp')}
                  onChange={(e) => {
                    e.target.value = formatWhatsApp(e.target.value);
                    register('whatsapp').onChange(e);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cidade" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  Cidade
                  <span className="text-red-500 ml-1" aria-label="Campo obrigatório">*</span>
                </Label>
                <Input
                  id="cidade"
                  placeholder="Digite a cidade"
                  aria-required="true"
                  defaultValue=""
                  className={`w-full h-10 px-3 rounded-lg bg-white dark:bg-gray-900 border focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors
                    ${errors.cidade ? 'border-red-300 dark:border-red-500 ring-2 ring-red-200 dark:ring-red-800' : 'border-gray-300 dark:border-gray-600'}`}
                  {...register('cidade')}
                  onChange={(e) => {
                    e.target.value = toTitleCase(e.target.value);
                    register('cidade').onChange(e);
                  }}
                />
                {errors.cidade && (
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1.5 flex items-center bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                    <AlertCircle className="h-4 w-4 mr-1.5 flex-shrink-0" />
                    Campo obrigatório
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bairro" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  Bairro
                  <span className="text-red-500 ml-1" aria-label="Campo obrigatório">*</span>
                </Label>
                <Input
                  id="bairro"
                  placeholder="Digite o bairro"
                  aria-required="true"
                  defaultValue=""
                  className={`w-full h-10 px-3 rounded-lg bg-white dark:bg-gray-900 border focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors
                    ${errors.bairro ? 'border-red-300 dark:border-red-500 ring-2 ring-red-200 dark:ring-red-800' : 'border-gray-300 dark:border-gray-600'}`}
                  {...register('bairro')}
                  onChange={(e) => {
                    e.target.value = toTitleCase(e.target.value);
                    register('bairro').onChange(e);
                  }}
                />
                {errors.bairro && (
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1.5 flex items-center bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                    <AlertCircle className="h-4 w-4 mr-1.5 flex-shrink-0" />
                    Campo obrigatório
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isSubmittingForm}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors"
              >
                {isSubmitting || isSubmittingForm ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Excluindo...</span>
                  </div>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white rounded-lg shadow-lg max-w-md mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              Excluir Indicado
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-4 text-gray-600">
              Tem certeza que deseja excluir <span className="font-medium text-gray-900">{deletingIndicado?.nome}</span>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-3">
            <AlertDialogCancel className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Excluindo...</span>
                </div>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}