import React, { useState, useMemo, useEffect } from 'react';
import { PlusCircle, CheckCircle, XCircle, Search, FileEdit, Trash2, Settings, Ban, Loader2, AlertTriangle, Users } from 'lucide-react';
import { useCategories } from '../../../hooks/useCategories';
import { useCategoriaTipos } from '../../../hooks/useCategoriaTipos';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { CategoryWithType } from '../../../services/categories';
import { categoriaTipoService } from '../../../services/categories';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { supabaseClient } from '../../../lib/supabase';

interface CategoriaFormData {
  nome: string;
  tipo_uid?: string;
}

interface CategoriaTag {
  id: string;
  nome: string;
}

interface CategoriaTipo {
  uid: string;
  nome: string;
}

interface DeleteModalState {
  isOpen: boolean;
  categoriaId: string;
  nome: string;
  hasVoters?: boolean;
}

export function CategorySettings() {
  const company = useCompanyStore((state) => state.company);
  const { data: categorias, isLoading, createCategory: create, updateCategory: update, deleteCategory: deleteCategoria, refetch } = useCategories();
  const { tipos, isLoading: isLoadingTipos, updateTipo, refetch: refetchTipos } = useCategoriaTipos();
  const { checkCategoryHasVoters } = useCategories();

  useEffect(() => {
    console.log('Estado atual da empresa:', company);
    console.log('Estado atual das categorias:', {
      categorias,
      isLoading,
      tipos,
      isLoadingTipos
    });
  }, [company, categorias, isLoading, tipos, isLoadingTipos]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<CategoriaFormData>({
    nome: '',
    tipo_uid: '',
  });
  const [newCategoria, setNewCategoria] = useState<CategoriaFormData>({
    nome: '',
    tipo_uid: '',
  });
  const [categoriasInput, setCategoriasInput] = useState('');
  const [categoriasTags, setCategoriasTags] = useState<CategoriaTag[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [editingTipoId, setEditingTipoId] = useState<string | null>(null);
  const [editingTipoData, setEditingTipoData] = useState<{ nome: string }>({ nome: '' });

  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    categoriaId: '',
    nome: '',
    hasVoters: false
  });

  const [newTipo, setNewTipo] = useState({ nome: '', isCreating: false });
  
  // Estado local para cores em tempo real
  const [localColors, setLocalColors] = useState<Record<string, string>>({});

  const filteredCategorias = useMemo(() => {
    if (!categorias) return [];

    const searchTermLower = searchTerm.toLowerCase();
    return categorias.filter((categoria) => {
      const matchNome = categoria.nome.toLowerCase().includes(searchTermLower);
      const matchTipo = categoria.tipo?.nome.toLowerCase().includes(searchTermLower);
      return matchNome || matchTipo;
    });
  }, [categorias, searchTerm]);

  const categoriasAgrupadas = useMemo(() => {
    if (!filteredCategorias || !tipos) {
      return [];
    }

    // Criar um mapa de tipos para facilitar o agrupamento
    const tiposMap = new Map(tipos.map(tipo => [tipo.uid, tipo]));
    
    // Agrupar categorias por tipo
    const gruposPorTipo = new Map<string, CategoryWithType[]>();
    
    // Inicializar grupos vazios para todos os tipos
    tipos.forEach(tipo => {
      gruposPorTipo.set(tipo.uid, []);
    });
    
    // Adicionar categorias aos seus respectivos grupos
    filteredCategorias.forEach(categoria => {
      const tipoUid = categoria.tipo_uid;
      if (tipoUid && tiposMap.has(tipoUid)) {
        const categoriasList = gruposPorTipo.get(tipoUid) || [];
        categoriasList.push(categoria);
        gruposPorTipo.set(tipoUid, categoriasList);
      }
    });

    // Converter o mapa em array de grupos
    const grupos = Array.from(gruposPorTipo.entries()).map(([tipoUid, categorias]) => ({
      tipo: tiposMap.get(tipoUid)!,
      categorias
    }));

    // Adicionar grupo para categorias sem tipo
    const categoriasSemTipo = filteredCategorias.filter(cat => !cat.tipo_uid);
    if (categoriasSemTipo.length > 0) {
      grupos.push({
        tipo: { uid: 'sem-tipo', nome: 'Sem Tipo', empresa_uid: '', id: 0, created_at: '' },
        categorias: categoriasSemTipo
      });
    }

    // Ordenar grupos por nome do tipo
    grupos.sort((a, b) => a.tipo.nome.localeCompare(b.tipo.nome));

    return grupos;
  }, [filteredCategorias, tipos]);

  const handleStartEdit = (categoria: CategoryWithType) => {
    setEditingId(categoria.uid);
    setEditingData({
      nome: categoria.nome || '',
      tipo_uid: categoria.tipo?.uid || ''
    });
  };

  const resetModalState = () => {
    setNewCategoria({
      nome: '',
      tipo_uid: '',
    });
    setCategoriasTags([]);
    setNewTipo({ nome: '', isCreating: false });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({
      nome: '',
      tipo_uid: '',
    });
    resetModalState();
  };

  const handleStartEditTipo = (tipo: CategoriaTipo) => {
    setEditingTipoId(tipo.uid);
    setEditingTipoData({ nome: tipo.nome });
  };

  const handleCancelEditTipo = () => {
    setEditingTipoId(null);
    setEditingTipoData({ nome: '' });
  };

  const capitalizeWords = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const toUpperCase = (str: string) => {
    return str.toUpperCase();
  };

  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleUpdate = async (uid: string) => {
    if (!editingData.nome) {
      toast.error('O nome da categoria é obrigatório');
      return;
    }

    try {
      const updateData = {
        nome: capitalizeWords(editingData.nome)
      };
      
      if (editingData.tipo_uid) {
        updateData.tipo_uid = editingData.tipo_uid;
      }

      await update(uid, updateData);
      toast.success('Categoria atualizada com sucesso!');
      handleCancelEdit();
      refetch();
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      toast.error('Erro ao atualizar categoria');
    }
  };

  const handleUpdateTipo = async (uid: string) => {
    try {
      await updateTipo({ uid, nome: toUpperCase(editingTipoData.nome) });
      toast.success('Tipo atualizado com sucesso!');
      handleCancelEditTipo();
    } catch (error) {
      console.error('Erro ao atualizar tipo:', error);
      toast.error('Erro ao atualizar tipo');
    }
  };

  const handleDelete = async (uid: string) => {
    try {
      await deleteCategoria(uid);
      toast.success('Categoria excluída com sucesso!');
      refetch();
    } catch (error) {
      if (error instanceof Error && error.message.includes('eleitores vinculados')) {
        toast.error('Não é possível excluir esta categoria pois existem eleitores vinculados a ela.', {
          autoClose: 5000
        });
      } else {
        toast.error('Erro ao excluir categoria');
        console.error('Erro ao excluir categoria:', error);
      }
    }
  };

  const handleAddCategoria = () => {
    const nomeFormatado = newCategoria.nome.trim();
    
    if (!nomeFormatado) return;
    
    // Verifica se a categoria já foi adicionada
    if (categoriasTags.some(tag => tag.nome.toLowerCase() === nomeFormatado.toLowerCase())) {
      toast.warning('Esta categoria já foi adicionada');
      return;
    }
    
    const novaTag = {
      id: Date.now().toString(),
      nome: nomeFormatado
    };
    
    setCategoriasTags([...categoriasTags, novaTag]);
    setNewCategoria(prev => ({ ...prev, nome: '' }));
  };

  const handleRemoveCategoria = (id: string) => {
    setCategoriasTags(categoriasTags.filter(tag => tag.id !== id));
  };

  const handleCreate = async () => {
    if (categoriasTags.length === 0) {
      toast.error('Adicione pelo menos uma categoria');
      return;
    }

    if (!newCategoria.tipo_uid) {
      toast.error('Selecione um tipo de categoria');
      return;
    }

    if (!company?.uid) {
      toast.error('Empresa não selecionada');
      return;
    }

    try {
      // Criar todas as categorias de uma vez
      await Promise.all(
        categoriasTags.map(tag => 
          create({
            nome: tag.nome,
            tipo_uid: newCategoria.tipo_uid,
            empresa_uid: company.uid
          })
        )
      );

      // Toast personalizado para sucesso na criação
      toast.success(
        <div className="p-2">
          <div className="flex items-center gap-2 text-green-700 font-medium">
            <CheckCircle className="w-5 h-5" />
            <span>Sucesso!</span>
          </div>
          <div className="mt-1 text-sm text-green-700">
            {categoriasTags.length} {categoriasTags.length === 1 ? 'categoria criada' : 'categorias criadas'} com sucesso!
          </div>
          <div className="mt-2 text-xs text-green-600">
            {categoriasTags.slice(0, 3).map((tag, index) => (
              <div key={index} className="truncate">• {tag.nome}</div>
            ))}
            {categoriasTags.length > 3 && (
              <div>e mais {categoriasTags.length - 3} categorias...</div>
            )}
          </div>
        </div>,
        {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          className: '!bg-green-50 !text-green-800 !border-l-4 !border-green-500 !rounded-lg',
          bodyClassName: '!p-0',
        }
      );
      setCategoriasTags([]);
      setNewCategoria({ nome: '', tipo_uid: '' });
      setIsCreating(false);
    } catch (error) {
      console.error('Erro ao criar categorias:', error);
      toast.error('Erro ao criar categorias');
    }
  };

  const handleCreateTipo = async () => {
    if (!newTipo.nome) {
      toast.error('Digite o nome do tipo');
      return;
    }

    if (!company?.uid) {
      toast.error('Empresa não selecionada');
      return;
    }

    try {
      const createdTipo = await categoriaTipoService.create({
        nome: toUpperCase(newTipo.nome),
        empresa_uid: company.uid
      });
      
      toast.success('Tipo criado com sucesso!');
      setNewTipo({ nome: '', isCreating: false });
      setNewCategoria(prev => ({ ...prev, tipo_uid: createdTipo.uid }));
      // O refetch será feito automaticamente pelo realtime
    } catch (error) {
      console.error('Erro ao criar tipo:', error);
      toast.error('Erro ao criar tipo');
    }
  };

  const handleStartCreate = () => {
    // Inicializa o modal com o primeiro tipo disponível
    if (tipos && tipos.length > 0) {
      setNewCategoria({ nome: '', tipo_uid: tipos[0].uid });
    } else {
      setNewCategoria({ nome: '', tipo_uid: '' });
    }
    setIsCreating(true);
  };

  const handleDeleteClick = async (categoria: CategoryWithType) => {
    try {
      const hasVoters = await checkCategoryHasVoters(categoria.uid);
      setDeleteModal({
        isOpen: true,
        categoriaId: categoria.uid,
        nome: categoria.nome,
        hasVoters
      });
    } catch (error) {
      toast.error('Erro ao verificar eleitores da categoria');
      console.error('Erro ao verificar eleitores:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.categoriaId) {
      await handleDelete(deleteModal.categoriaId);
      setDeleteModal({ isOpen: false, categoriaId: '', nome: '', hasVoters: false });
    }
  };

  const handleCancelDelete = () => {
    setDeleteModal({ isOpen: false, categoriaId: '', nome: '', hasVoters: false });
  };

  return (
    <div className="space-y-4 md:space-y-6 relative min-h-screen pb-20 sm:pb-0">
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:justify-between">
        <div className="w-full sm:max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-300 h-5 w-5 stroke-[1.5]" />
          <input
            type="text"
            placeholder="Buscar por nome ou tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
        </div>
        <button
          onClick={handleStartCreate}
          className="hidden sm:flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm whitespace-nowrap"
        >
          <PlusCircle className="h-5 w-5" />
          Nova Categoria
        </button>
      </div>

      {/* Botão flutuante para mobile */}
      <button
        onClick={handleStartCreate}
        className="fixed bottom-6 right-6 sm:hidden flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg z-50"
      >
        <PlusCircle className="h-6 w-6" />
      </button>

      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[600px] mx-auto overflow-hidden transform transition-all">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <PlusCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-1">Nova Categoria</h2>
                  <p className="text-gray-500">Crie uma nova categoria para organizar seus eleitores</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Categoria
                  </label>
                  {!newTipo.isCreating ? (
                    <div className="flex gap-2">
                      <select
                        id="tipo"
                        value={newCategoria.tipo_uid}
                        onChange={(e) => setNewCategoria({ ...newCategoria, tipo_uid: e.target.value })}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Selecione um tipo</option>
                        {tipos?.map((tipo) => (
                          <option key={tipo.uid} value={tipo.uid}>
                            {tipo.nome}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setNewTipo(prev => ({ ...prev, isCreating: true }))}
                        className="px-4 py-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Criar novo tipo"
                      >
                        <PlusCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTipo.nome}
                        onChange={(e) => setNewTipo(prev => ({ ...prev, nome: e.target.value.toUpperCase() }))}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="DIGITE O NOME DO NOVO TIPO"
                      />
                      <button
                        onClick={handleCreateTipo}
                        disabled={!newTipo.nome}
                        className="px-4 py-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Salvar novo tipo"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setNewTipo({ nome: '', isCreating: false })}
                        className="px-4 py-3 text-gray-500 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Cancelar"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    {!newTipo.isCreating 
                      ? 'O tipo ajuda a organizar suas categorias em grupos'
                      : 'Digite o nome do novo tipo em letras maiúsculas'
                    }
                  </p>
                </div>

                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Categoria
                    <span className="text-xs text-gray-500 ml-1">(Pressione Enter ou clique em Adicionar)</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      id="nome"
                      value={newCategoria.nome}
                      onChange={(e) => setNewCategoria(prev => ({ ...prev, nome: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategoria())}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                      placeholder="Digite o nome da categoria"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategoria}
                      disabled={!newCategoria.nome.trim()}
                      className="px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Adicionar
                    </button>
                  </div>
                  
                  {/* Tags das categorias adicionadas */}
                  {categoriasTags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {categoriasTags.map(tag => (
                        <span 
                          key={tag.id}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {tag.nome}
                          <button 
                            type="button"
                            onClick={() => handleRemoveCategoria(tag.id)}
                            className="ml-1.5 text-blue-500 hover:text-blue-700"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <p className="mt-2 text-sm text-gray-500">
                    Adicione várias categorias separadamente. {categoriasTags.length} {categoriasTags.length === 1 ? 'categoria adicionada' : 'categorias adicionadas'}.
                  </p>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      resetModalState();
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={categoriasTags.length === 0 || !newCategoria.tipo_uid}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {categoriasTags.length === 0 
                      ? 'Criar Categoria' 
                      : `Criar ${categoriasTags.length} ${categoriasTags.length === 1 ? 'Categoria' : 'Categorias'}`
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      )}

      {isLoadingTipos && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      )}

      {!isLoading && !isLoadingTipos && categoriasAgrupadas.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Nenhuma categoria encontrada
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {categoriasAgrupadas.map((grupo) => (
            <div key={grupo.tipo.uid} className="bg-white rounded-lg shadow border overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-2 sm:px-4 py-3 border-b flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:justify-between">
                {editingTipoId === grupo.tipo.uid ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
                    <input
                      type="text"
                      value={editingTipoData.nome}
                      onChange={(e) => setEditingTipoData({ nome: toUpperCase(e.target.value) })}
                      className="flex-1 px-4 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 uppercase bg-white"
                    />
                    <div className="flex items-center gap-2 self-end">
                      <button
                        onClick={() => handleUpdateTipo(grupo.tipo.uid)}
                        className="p-2.5 text-emerald-500 hover:text-white hover:bg-emerald-500 transition-all rounded-full hover:shadow-md"
                        title="Salvar"
                      >
                        <CheckCircle className="h-5 w-5 stroke-[1.5] transform hover:scale-110 transition-transform" />
                      </button>
                      <button
                        onClick={handleCancelEditTipo}
                        className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-400 transition-all rounded-full hover:shadow-md"
                        title="Cancelar"
                      >
                        <XCircle className="h-5 w-5 stroke-[1.5] transform hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-indigo-900 uppercase">{grupo.tipo.nome}</h3>
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => handleStartEditTipo(grupo.tipo)}
                        className="p-2.5 text-indigo-400 hover:text-white hover:bg-indigo-400 transition-all rounded-full hover:shadow-md"
                        title="Editar Tipo"
                      >
                        <Settings className="h-5 w-5 stroke-[1.5] transform hover:rotate-90 transition-transform duration-300" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="divide-y divide-indigo-100">
                {grupo.categorias.map((categoria) => (
                  <div key={categoria.uid} className="px-2 sm:px-4 py-2 hover:bg-indigo-50/50 transition-colors">
                    {editingId === categoria.uid ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        <div className="flex-1 flex flex-col sm:flex-row gap-4">
                          <input
                            type="text"
                            value={editingData.nome}
                            onChange={(e) => setEditingData({ ...editingData, nome: capitalizeWords(e.target.value) })}
                            className="flex-1 px-4 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                          />
                          <select
                            value={editingData.tipo_uid || ''}
                            onChange={(e) => setEditingData({ ...editingData, tipo_uid: e.target.value })}
                            className="w-full sm:w-auto px-4 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                          >
                            <option value="">Sem tipo</option>
                            {tipos?.map((tipo) => (
                              <option key={tipo.uid} value={tipo.uid} className="uppercase">
                                {tipo.nome.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => handleUpdate(categoria.uid)}
                            className="p-2.5 text-emerald-500 hover:text-white hover:bg-emerald-500 transition-all rounded-full hover:shadow-md"
                            title="Salvar"
                          >
                            <CheckCircle className="h-5 w-5 stroke-[1.5] transform hover:scale-110 transition-transform" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-400 transition-all rounded-full hover:shadow-md"
                            title="Cancelar"
                          >
                            <XCircle className="h-5 w-5 stroke-[1.5] transform hover:scale-110 transition-transform" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="relative">
                            <input
                              type="color"
                              value={localColors[categoria.uid] || categoria.cor || '#3B82F6'}
                              onChange={async (e) => {
                                const newColor = e.target.value;
                                
                                // Atualiza imediatamente no estado local
                                setLocalColors(prev => ({ ...prev, [categoria.uid]: newColor }));
                                
                                try {
                                  const { error } = await supabaseClient
                                    .from('gbp_categorias')
                                    .update({ cor: newColor })
                                    .eq('uid', categoria.uid);
                                  
                                  if (error) throw error;
                                  // Atualiza silenciosamente sem toast
                                  refetch();
                                } catch (error) {
                                  console.error('Erro ao atualizar cor:', error);
                                  toast.error('Erro ao atualizar cor');
                                  // Reverte a cor local em caso de erro
                                  setLocalColors(prev => {
                                    const newColors = { ...prev };
                                    delete newColors[categoria.uid];
                                    return newColors;
                                  });
                                }
                              }}
                              className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300 hover:border-indigo-400 transition-colors"
                              style={{ 
                                backgroundColor: localColors[categoria.uid] || categoria.cor || '#3B82F6',
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                MozAppearance: 'none'
                              }}
                              title="Alterar cor da categoria"
                            />
                          </div>
                          <span className="text-slate-700 flex-1">{categoria.nome}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            onClick={() => handleStartEdit(categoria)}
                            className="p-2.5 text-indigo-400 hover:text-white hover:bg-indigo-400 transition-all rounded-full hover:shadow-md group"
                            title="Editar Categoria"
                          >
                            <FileEdit className="h-5 w-5 stroke-[1.5] transform group-hover:scale-110 transition-transform" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(categoria)}
                            className="p-2.5 text-rose-400 hover:text-white hover:bg-rose-400 transition-all rounded-full hover:shadow-md group"
                            title="Excluir Categoria"
                          >
                            <Trash2 className="h-5 w-5 stroke-[1.5] transform group-hover:scale-110 transition-transform" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-auto overflow-hidden transform transition-all">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full ${deleteModal.hasVoters ? 'bg-amber-100' : 'bg-rose-100'} flex items-center justify-center flex-shrink-0`}>
                  {deleteModal.hasVoters ? (
                    <Ban className="w-6 h-6 text-amber-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {deleteModal.hasVoters ? 'Não é possível excluir' : 'Confirmar Exclusão'}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    {deleteModal.hasVoters 
                      ? 'Esta categoria possui eleitores vinculados e não pode ser excluída.'
                      : 'Tem certeza que deseja excluir esta categoria?'
                    }
                  </p>
                </div>
              </div>
              
              <div className={`${deleteModal.hasVoters ? 'bg-amber-50' : 'bg-rose-50'} rounded-lg p-4 mb-6`}>
                <p className={`${deleteModal.hasVoters ? 'text-amber-800' : 'text-rose-800'} font-medium text-center`}>
                  {deleteModal.nome}
                </p>
                <div className="mt-2 flex items-center justify-center gap-2 text-sm text-amber-600">
                  {deleteModal.hasVoters ? (
                    <>
                      <Users className="w-4 h-4" />
                      <span>Remova todos os eleitores desta categoria antes de excluí-la.</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      <span>Esta ação não pode ser desfeita.</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  {deleteModal.hasVoters ? 'Entendi' : 'Cancelar'}
                </button>
                {!deleteModal.hasVoters && (
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-lg hover:from-rose-600 hover:to-rose-700 transition-all font-medium"
                  >
                    Confirmar Exclusão
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
