import React, { useState, useMemo, useEffect } from 'react';
import { 
  PlusCircle, 
  CheckCircle, 
  XCircle, 
  Search, 
  FileEdit, 
  Trash2, 
  Settings, 
  Ban, 
  Loader2, 
  AlertTriangle, 
  Users,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  GripVertical,
  FolderOpen,
  FolderPlus,
  FolderX,
  Pencil,
  X
} from 'lucide-react';
import { useCategories } from '../../../hooks/useCategories';
import { useCategoriaTipos } from '../../../hooks/useCategoriaTipos';
import { useCategoriaGrupos } from '../../../hooks/useCategoriaGrupos';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { CategoryWithType } from '../../../services/categories';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { supabaseClient } from '../../../lib/supabase';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';

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
  grupo_uid?: string | null;
  grupo?: { uid: string; nome: string } | null;
}

interface DeleteModalState {
  isOpen: boolean;
  categoriaId: string;
  nome: string;
  hasVoters?: boolean;
}

// Seção droppable que representa um grupo de tipos (ou a área "Sem grupo")
function GrupoDropSection({
  id,
  isDragging,
  muted = false,
  children,
}: {
  id: string;
  isDragging: boolean;
  muted?: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const state = isOver
    ? 'border-blue-500 bg-blue-100/50 dark:bg-blue-900/30 ring-4 ring-blue-400/30 shadow-lg scale-[1.005]'
    : isDragging
      ? 'border-dashed border-blue-400 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-900/10'
      : muted
        ? 'border-gray-300 dark:border-gray-600 bg-gray-50/60 dark:bg-gray-800/40'
        : 'border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-900/10 shadow-sm';

  return (
    <section ref={setNodeRef} className={`rounded-xl border-2 transition-all ${state}`}>
      {children}
    </section>
  );
}

// Alça de arraste exibida no header de cada card de tipo
function TipoDragHandle({
  tipoUid,
  onPreview,
}: {
  tipoUid: string;
  onPreview: (active: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `tipo:${tipoUid}` });

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onMouseEnter={() => onPreview(true)}
      onMouseLeave={() => onPreview(false)}
      onFocus={() => onPreview(true)}
      onBlur={() => onPreview(false)}
      className="relative group p-1 -ml-1 text-gray-400 dark:text-gray-500 bg-gray-200/70 dark:bg-gray-700/70 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 border border-gray-300/60 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 cursor-grab active:cursor-grabbing rounded-lg transition-colors touch-none flex-shrink-0"
      title="Arrastar tipo para um grupo"
    >
      <GripVertical className="h-5 w-5" />
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] font-semibold px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
        Segure e arraste até uma pasta
      </span>
    </button>
  );
}

export function CategorySettings() {
  const company = useCompanyStore((state) => state.company);
  const { data: categorias, isLoading, createCategory: create, updateCategory: update, deleteCategory: deleteCategoria, refetch } = useCategories();
  const { tipos, isLoading: isLoadingTipos, createTipo, updateTipo, deleteTipo, refetch: refetchTipos } = useCategoriaTipos();
  const { grupos: categoriaGrupos, createGrupo, updateGrupo, deleteGrupo } = useCategoriaGrupos();
  const queryClient = useQueryClient();
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
  const [editingTipoData, setEditingTipoData] = useState<{ nome: string; grupo_uid: string }>({ nome: '', grupo_uid: '' });
  const [novoGrupoNome, setNovoGrupoNome] = useState('');

  // Drag & drop + gestão de grupos na barra superior
  const [activeDragTipo, setActiveDragTipo] = useState<string | null>(null);
  const [isCreatingGrupo, setIsCreatingGrupo] = useState(false);
  const [novoGrupoBarNome, setNovoGrupoBarNome] = useState('');
  const [renamingGrupoId, setRenamingGrupoId] = useState<string | null>(null);
  const [renameGrupoNome, setRenameGrupoNome] = useState('');
  const [deleteGrupoModal, setDeleteGrupoModal] = useState<{ isOpen: boolean; grupoId: string; grupoNome: string }>({
    isOpen: false,
    grupoId: '',
    grupoNome: '',
  });
  const [previewDropZones, setPreviewDropZones] = useState(false);

  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    categoriaId: '',
    nome: '',
    hasVoters: false
  });

  const [deleteTipoModal, setDeleteTipoModal] = useState<{
    isOpen: boolean;
    tipoId: string;
    tipoNome: string;
  }>({
    isOpen: false,
    tipoId: '',
    tipoNome: ''
  });

  const [newTipo, setNewTipo] = useState({ nome: '', isCreating: false });
  
  // Paginação por grupo de categorias (10 por página)
  const [groupPages, setGroupPages] = useState<Record<string, number>>({});
  const ITENS_POR_PAGINA = 10;

  // Menu suspenso de ações da categoria (3 pontinhos)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-category-menu]')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    setGroupPages({});
  }, [searchTerm]);

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
        tipo: { uid: 'sem-tipo', nome: 'Sem Tipo', empresa_uid: '', id: 0, created_at: '', categorias: [] },
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
    setEditingTipoData({ nome: tipo.nome, grupo_uid: tipo.grupo_uid || '' });
    setNovoGrupoNome('');
  };

  const handleCancelEditTipo = () => {
    setEditingTipoId(null);
    setEditingTipoData({ nome: '', grupo_uid: '' });
    setNovoGrupoNome('');
  };

  const toUpperCase = (str: string) => {
    return str.toUpperCase();
  };

  const toTitleCase = (str: string) => {
    const exceptions = ['de', 'da', 'do', 'das', 'dos', 'e', 'ou', 'em', 'no', 'na', 'nos', 'nas', 'a', 'o', 'os', 'as'];
    
    return str
      .toLowerCase()
      .split(' ')
      .map((word, index) => {
        // Primeira palavra sempre com inicial maiúscula
        if (index === 0) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        // Palavras de exceção ficam em minúsculas
        if (exceptions.includes(word)) {
          return word;
        }
        // Demais palavras com inicial maiúscula
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };

  const handleUpdate = async (uid: string) => {
    if (!editingData.nome) {
      toast.error('O nome da categoria é obrigatório');
      return;
    }

    try {
      const updateData: any = {
        uid,
        nome: toTitleCase(editingData.nome)
      };
      
      if (editingData.tipo_uid) {
        updateData.tipo_uid = editingData.tipo_uid;
      }

      await update(updateData);
      toast.success('Categoria atualizada com sucesso!');
      handleCancelEdit();
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      toast.error('Erro ao atualizar categoria');
    }
  };

  const handleUpdateTipo = async (uid: string) => {
    try {
      let grupoUid: string | null = editingTipoData.grupo_uid || null;

      // Criação inline de novo grupo
      if (editingTipoData.grupo_uid === '__novo__') {
        if (!novoGrupoNome.trim()) {
          toast.error('Digite o nome do novo grupo');
          return;
        }
        const novoGrupo = await createGrupo(novoGrupoNome.trim().toUpperCase());
        grupoUid = novoGrupo.uid;
      }

      await updateTipo({ uid, nome: toUpperCase(editingTipoData.nome), grupo_uid: grupoUid });
      toast.success('Tipo atualizado com sucesso!');
      handleCancelEditTipo();
    } catch (error) {
      console.error('Erro ao atualizar tipo:', error);
      toast.error('Erro ao atualizar tipo');
    }
  };

  // ---------- Drag & Drop: tipo → grupo ----------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  // Seções visuais: uma "pasta" por grupo + seção final "Sem grupo"
  const secoes = useMemo(() => {
    const list: {
      key: string;
      dropId: string;
      nome: string;
      grupoUid: string | null;
      items: typeof categoriasAgrupadas;
    }[] = categoriaGrupos.map((g) => ({
      key: g.uid,
      dropId: `grupo:${g.uid}`,
      nome: g.nome,
      grupoUid: g.uid as string | null,
      items: categoriasAgrupadas.filter((i) => i.tipo.grupo_uid === g.uid),
    }));

    list.push({
      key: 'sem-grupo',
      dropId: 'grupo:none',
      nome: 'Sem grupo',
      grupoUid: null,
      items: categoriasAgrupadas.filter((i) => !i.tipo.grupo_uid),
    });

    return list;
  }, [categoriaGrupos, categoriasAgrupadas]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragTipo(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const dragId = String(event.active.id);
    setActiveDragTipo(null);

    const overId = event.over ? String(event.over.id) : null;
    console.log('[DnD] drag end:', { dragId, overId });
    if (!overId || !dragId.startsWith('tipo:')) return;

    const tipoUid = dragId.replace('tipo:', '');
    const novoGrupoUid = overId === 'grupo:none' ? null : overId.replace('grupo:', '');
    const tipo = tipos?.find((t) => t.uid === tipoUid);
    if (!tipo || (tipo.grupo_uid || null) === novoGrupoUid) return;

    try {
      await updateTipo({ uid: tipoUid, grupo_uid: novoGrupoUid });
      await refetchTipos();
      queryClient.invalidateQueries({ queryKey: ['categorias', company?.uid] });
      toast.success(novoGrupoUid ? 'Tipo movido para o grupo!' : 'Tipo removido do grupo');
    } catch (error) {
      console.error('Erro ao mover tipo:', error);
      toast.error('Erro ao mover tipo para o grupo');
    }
  };

  const handleCreateGrupoBar = async () => {
    const nome = novoGrupoBarNome.trim();
    if (!nome) return;
    try {
      await createGrupo(nome.toUpperCase());
      setNovoGrupoBarNome('');
      setIsCreatingGrupo(false);
      toast.success('Grupo criado! Arraste tipos até ele.');
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      toast.error('Erro ao criar grupo');
    }
  };

  const handleRenameGrupo = async (uid: string) => {
    const nome = renameGrupoNome.trim();
    setRenamingGrupoId(null);
    if (!nome) return;
    try {
      await updateGrupo({ uid, nome: nome.toUpperCase() });
      toast.success('Grupo renomeado');
    } catch (error) {
      console.error('Erro ao renomear grupo:', error);
      toast.error('Erro ao renomear grupo');
    }
  };

  const handleConfirmDeleteGrupo = async () => {
    try {
      await deleteGrupo(deleteGrupoModal.grupoId);
      toast.success('Grupo excluído. Os tipos vinculados ficaram sem grupo.');
      setDeleteGrupoModal({ isOpen: false, grupoId: '', grupoNome: '' });
    } catch (error) {
      console.error('Erro ao excluir grupo:', error);
      toast.error('Erro ao excluir grupo');
    }
  };

  const handleDelete = async (uid: string) => {
    try {
      await deleteCategoria(uid);
      toast.success('Categoria excluída com sucesso!');
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
    const nomeOriginal = newCategoria.nome.trim();
    
    if (!nomeOriginal) return;
    
    // Formatar o nome com Title Case
    const nomeFormatado = toTitleCase(nomeOriginal);
    
    // Verifica se a categoria já foi adicionada nas tags
    if (categoriasTags.some(tag => tag.nome.toLowerCase() === nomeFormatado.toLowerCase())) {
      toast.warning('Esta categoria já foi adicionada');
      return;
    }
    
    // Verifica se a categoria já existe no banco de dados
    if (categorias?.some(cat => 
      cat.nome.toLowerCase() === nomeFormatado.toLowerCase() && 
      cat.tipo_uid === newCategoria.tipo_uid
    )) {
      toast.warning('Esta categoria já existe neste tipo');
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
      const createdTipo = await createTipo({
        nome: toUpperCase(newTipo.nome),
        empresa_uid: company.uid
      });
      
      toast.success('Tipo criado com sucesso!');
      setNewTipo({ nome: '', isCreating: false });
      setNewCategoria(prev => ({ ...prev, tipo_uid: createdTipo.uid }));
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

  const handleDeleteTipoClick = (tipo: CategoriaTipo) => {
    setDeleteTipoModal({
      isOpen: true,
      tipoId: tipo.uid,
      tipoNome: tipo.nome
    });
  };

  const handleConfirmDeleteTipo = async () => {
    try {
      await deleteTipo(deleteTipoModal.tipoId);
      toast.success('Tipo excluído com sucesso!');
      setDeleteTipoModal({ isOpen: false, tipoId: '', tipoNome: '' });
    } catch (error) {
      console.error('Erro ao excluir tipo:', error);
      toast.error('Erro ao excluir tipo');
    }
  };

  const handleCancelDeleteTipo = () => {
    setDeleteTipoModal({ isOpen: false, tipoId: '', tipoNome: '' });
  };

  return (
    <div className="space-y-4 md:space-y-6 relative min-h-screen pb-20 sm:pb-0">
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar por nome ou tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <button
          onClick={handleStartCreate}
          className="hidden sm:inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium shadow-xs whitespace-nowrap"
        >
          <PlusCircle className="h-4 w-4" />
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
                      autoComplete="off"
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
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDragTipo(null)}
        >
          {/* Controles de grupo */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
              <FolderOpen className="h-3.5 w-3.5 text-blue-500" />
              <span>As <b className="text-blue-600 dark:text-blue-400">pastas azuis</b> agrupam os tipos. Arraste um tipo pelo ícone</span>
              <GripVertical className="h-3.5 w-3.5" />
              <span>para dentro de outra pasta</span>
            </div>
            {isCreatingGrupo ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={novoGrupoBarNome}
                  onChange={(e) => setNovoGrupoBarNome(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateGrupoBar();
                    if (e.key === 'Escape') { setIsCreatingGrupo(false); setNovoGrupoBarNome(''); }
                  }}
                  placeholder="NOME DO GRUPO"
                  className="w-40 px-2.5 py-1.5 text-xs border border-blue-400 rounded-lg uppercase bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleCreateGrupoBar}
                  disabled={!novoGrupoBarNome.trim()}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg disabled:opacity-40"
                  title="Criar grupo"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setIsCreatingGrupo(false); setNovoGrupoBarNome(''); }}
                  className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title="Cancelar"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreatingGrupo(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 uppercase transition-colors"
                title="Criar novo grupo"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                Novo grupo
              </button>
            )}
          </div>

          {/* Seções: cada grupo é uma "pasta" que contém os cards de tipo */}
          <div className="space-y-4 sm:space-y-5">
            {secoes.map((secao) => (
              <GrupoDropSection
                key={secao.key}
                id={secao.dropId}
                isDragging={!!activeDragTipo || previewDropZones}
                muted={!secao.grupoUid}
              >
                <div className={`flex items-center gap-2.5 px-3.5 py-2.5 border-b rounded-t-xl ${
                  secao.grupoUid
                    ? 'border-blue-200 dark:border-blue-800/60 bg-blue-100/80 dark:bg-blue-900/30'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50'
                }`}>
                  {secao.grupoUid ? (
                    renamingGrupoId === secao.grupoUid ? (
                      <input
                        autoFocus
                        value={renameGrupoNome}
                        onChange={(e) => setRenameGrupoNome(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameGrupo(secao.grupoUid!);
                          if (e.key === 'Escape') setRenamingGrupoId(null);
                        }}
                        onBlur={() => handleRenameGrupo(secao.grupoUid!)}
                        className="w-40 px-2 py-1 text-xs border border-blue-400 rounded-lg uppercase bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <>
                        <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span className="text-sm font-black text-blue-900 dark:text-blue-100 uppercase tracking-wider truncate">
                          {secao.nome}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-800/60 text-[10px] font-semibold text-blue-700 dark:text-blue-200 flex-shrink-0">
                          {secao.items.length} {secao.items.length === 1 ? 'tipo' : 'tipos'}
                        </span>
                        <div className="ml-auto flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => { setRenamingGrupoId(secao.grupoUid); setRenameGrupoNome(secao.nome); }}
                            className="p-1 text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 rounded transition-colors"
                            title="Renomear grupo"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteGrupoModal({ isOpen: true, grupoId: secao.grupoUid!, grupoNome: secao.nome })}
                            className="p-1 text-blue-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                            title="Excluir grupo"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )
                  ) : (
                    <>
                      <FolderX className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Tipos sem grupo
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-gray-200/80 dark:bg-gray-600/60 text-[10px] font-semibold text-gray-500 dark:text-gray-300">
                        {secao.items.length} {secao.items.length === 1 ? 'tipo' : 'tipos'}
                      </span>
                    </>
                  )}
                </div>

                <div className={`m-2.5 sm:m-3 ml-4 sm:ml-5 pl-3 sm:pl-4 border-l-2 grid gap-3 sm:gap-4 ${
                  secao.grupoUid
                    ? 'border-blue-300 dark:border-blue-700'
                    : 'border-dashed border-gray-300 dark:border-gray-600'
                }`}>
                  {secao.items.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-600 rounded-lg">
                      {secao.grupoUid
                        ? 'Nenhum tipo nesta pasta — arraste um tipo para cá'
                        : 'Todos os tipos estão dentro de pastas'}
                    </div>
                  ) : (
                    secao.items.map((grupo) => (
            <div key={grupo.tipo.uid} className={`bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 relative transition-opacity ${activeDragTipo === `tipo:${grupo.tipo.uid}` ? 'opacity-60' : ''}`}>
              <div className="bg-gray-50/90 dark:bg-gray-750 px-3.5 py-2.5 border-b border-gray-200 dark:border-gray-700 rounded-t-xl flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:justify-between">
                {editingTipoId === grupo.tipo.uid ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                    <input
                      type="text"
                      value={editingTipoData.nome}
                      onChange={(e) => setEditingTipoData({ ...editingTipoData, nome: toUpperCase(e.target.value) })}
                      className="flex-1 px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    {grupo.tipo.uid !== 'sem-tipo' && (
                      <>
                        <select
                          value={editingTipoData.grupo_uid}
                          onChange={(e) => setEditingTipoData({ ...editingTipoData, grupo_uid: e.target.value })}
                          className="w-full sm:w-48 px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          title="Grupo do tipo"
                        >
                          <option value="">Sem grupo</option>
                          {categoriaGrupos.map((g) => (
                            <option key={g.uid} value={g.uid} className="uppercase">
                              {g.nome}
                            </option>
                          ))}
                          <option value="__novo__">+ Novo grupo</option>
                        </select>
                        {editingTipoData.grupo_uid === '__novo__' && (
                          <input
                            type="text"
                            value={novoGrupoNome}
                            onChange={(e) => setNovoGrupoNome(e.target.value.toUpperCase())}
                            placeholder="NOME DO NOVO GRUPO"
                            className="w-full sm:w-48 px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        )}
                      </>
                    )}
                    <div className="flex items-center gap-1 self-end">
                      <button
                        onClick={() => handleUpdateTipo(grupo.tipo.uid)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                        title="Salvar"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancelEditTipo}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Cancelar"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      {grupo.tipo.uid !== 'sem-tipo' && <TipoDragHandle tipoUid={grupo.tipo.uid} onPreview={setPreviewDropZones} />}
                      <h3 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider truncate">
                        {grupo.tipo.nome}
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-200/70 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full flex-shrink-0">
                        {grupo.categorias.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => handleStartEditTipo(grupo.tipo)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Editar Tipo"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      {grupo.categorias.length === 0 && grupo.tipo.uid !== 'sem-tipo' && (
                        <button
                          onClick={() => handleDeleteTipoClick(grupo.tipo)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Excluir Tipo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {(() => {
                  const totalItens = grupo.categorias.length;
                  const temPaginacao = totalItens > ITENS_POR_PAGINA;
                  const totalPaginas = Math.ceil(totalItens / ITENS_POR_PAGINA);
                  const paginaAtual = Math.min(Math.max(1, groupPages[grupo.tipo.uid] || 1), totalPaginas || 1);
                  const startIndex = (paginaAtual - 1) * ITENS_POR_PAGINA;
                  const endIndex = startIndex + ITENS_POR_PAGINA;
                  const categoriasExibidas = temPaginacao ? grupo.categorias.slice(startIndex, endIndex) : grupo.categorias;

                  return (
                    <>
                      {categoriasExibidas.map((categoria) => (
                        <div key={categoria.uid} className="px-3.5 py-2 hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors">
                          {editingId === categoria.uid ? (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                                <input
                                  type="text"
                                  value={editingData.nome}
                                  onChange={(e) => setEditingData({ ...editingData, nome: e.target.value })}
                                  className="flex-1 px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <select
                                  value={editingData.tipo_uid || ''}
                                  onChange={(e) => setEditingData({ ...editingData, tipo_uid: e.target.value })}
                                  className="w-full sm:w-auto px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  <option value="">Sem tipo</option>
                                  {tipos?.map((tipo) => (
                                    <option key={tipo.uid} value={tipo.uid} className="uppercase">
                                      {tipo.nome.toUpperCase()}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-center gap-1 self-end sm:self-auto">
                                <button
                                  onClick={() => handleUpdate(categoria.uid)}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                  title="Salvar"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                  title="Cancelar"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 justify-between">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <input
                                  type="color"
                                  value={localColors[categoria.uid] || categoria.cor || '#3B82F6'}
                                  onChange={async (e) => {
                                    const newColor = e.target.value;
                                    setLocalColors(prev => ({ ...prev, [categoria.uid]: newColor }));
                                    try {
                                      const { error } = await supabaseClient
                                        .from('gbp_categorias')
                                        .update({ cor: newColor })
                                        .eq('uid', categoria.uid);
                                      if (error) throw error;
                                      refetch();
                                    } catch (error) {
                                      console.error('Erro ao atualizar cor:', error);
                                      toast.error('Erro ao atualizar cor');
                                      setLocalColors(prev => {
                                        const newColors = { ...prev };
                                        delete newColors[categoria.uid];
                                        return newColors;
                                      });
                                    }
                                  }}
                                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-md cursor-pointer border border-black/15 shadow-2xs hover:scale-105 transition-transform flex-shrink-0"
                                  style={{ 
                                    backgroundColor: localColors[categoria.uid] || categoria.cor || '#3B82F6',
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    MozAppearance: 'none'
                                  }}
                                  title="Alterar cor da categoria"
                                />
                                <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                  {categoria.nome}
                                </span>
                              </div>
                              <div className="relative flex-shrink-0" data-category-menu>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(prev => prev === categoria.uid ? null : categoria.uid);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                  title="Opções"
                                  aria-label="Opções da categoria"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>

                                {openMenuId === categoria.uid && (
                                  <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-30">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        handleStartEdit(categoria);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                                    >
                                      <FileEdit className="h-3.5 w-3.5 text-blue-500" />
                                      <span>Editar</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        handleDeleteClick(categoria);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                      <span>Excluir</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {temPaginacao && (
                        <div className="bg-gray-50/80 dark:bg-gray-750 px-3.5 py-2 border-t border-gray-200 dark:border-gray-700 rounded-b-xl flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            Mostrando <strong className="font-semibold text-gray-700 dark:text-gray-300">{startIndex + 1}–{Math.min(endIndex, totalItens)}</strong> de <strong className="font-semibold text-gray-700 dark:text-gray-300">{totalItens}</strong>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setGroupPages(prev => ({ ...prev, [grupo.tipo.uid]: paginaAtual - 1 }))}
                              disabled={paginaAtual <= 1}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                              title="Página anterior"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Anterior</span>
                            </button>
                            <span className="px-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                              {paginaAtual} / {totalPaginas}
                            </span>
                            <button
                              type="button"
                              onClick={() => setGroupPages(prev => ({ ...prev, [grupo.tipo.uid]: paginaAtual + 1 }))}
                              disabled={paginaAtual >= totalPaginas}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                              title="Próxima página"
                            >
                              <span className="hidden sm:inline">Próxima</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
                    ))
                  )}
                </div>
              </GrupoDropSection>
            ))}
          </div>

          <DragOverlay>
            {activeDragTipo && (
              <div className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold uppercase shadow-xl flex items-center gap-1.5">
                <GripVertical className="h-3.5 w-3.5" />
                {tipos?.find((t) => `tipo:${t.uid}` === activeDragTipo)?.nome}
              </div>
            )}
          </DragOverlay>
        </DndContext>
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

      {/* Modal de Confirmação de Exclusão de Tipo */}
      {deleteTipoModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-auto overflow-hidden transform transition-all">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
                  <p className="text-gray-600 mt-1">
                    Tem certeza que deseja excluir este tipo?
                  </p>
                </div>
              </div>
              
              <div className="bg-rose-50 rounded-lg p-4 mb-6">
                <p className="text-rose-800 font-medium text-center">
                  {deleteTipoModal.tipoNome}
                </p>
                <div className="mt-2 flex items-center justify-center gap-2 text-sm text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Esta ação não pode ser desfeita.</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={handleCancelDeleteTipo}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDeleteTipo}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-lg hover:from-rose-600 hover:to-rose-700 transition-all font-medium"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Grupo */}
      {deleteGrupoModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-auto overflow-hidden transform transition-all">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Excluir Grupo</h3>
                  <p className="text-gray-600 mt-1">
                    Tem certeza que deseja excluir este grupo?
                  </p>
                </div>
              </div>

              <div className="bg-rose-50 rounded-lg p-4 mb-6">
                <p className="text-rose-800 font-medium text-center">
                  {deleteGrupoModal.grupoNome}
                </p>
                <div className="mt-2 flex items-center justify-center gap-2 text-sm text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Os tipos vinculados ficarão sem grupo.</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setDeleteGrupoModal({ isOpen: false, grupoId: '', grupoNome: '' })}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDeleteGrupo}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-lg hover:from-rose-600 hover:to-rose-700 transition-all font-medium"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
