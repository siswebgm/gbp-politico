import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuState, MenuSection } from '../types/menu';

const createMenuStore = (name: string) => {
  return create<MenuState>()(
    persist(
      (set) => ({
        isOpen: false,
        activeItemId: null,
        expandedItems: [],
        sections: [],
        recentPaths: [],

        toggleMenu: () => set((state) => ({ isOpen: !state.isOpen })),

        setActiveItem: (itemId: string) =>
          set({ activeItemId: itemId }),

        toggleExpandedItem: (itemId: string) =>
          set((state) => ({
            expandedItems: state.expandedItems.includes(itemId)
              ? state.expandedItems.filter((id) => id !== itemId)
              : [...state.expandedItems, itemId],
          })),

        addRecentPath: (path: string) =>
          set((state) => ({
            recentPaths: [
              path,
              ...state.recentPaths.filter((p) => p !== path).slice(0, 4),
            ],
          })),

        setSections: (sections: MenuSection[]) =>
          set({ sections }),
      }),
      {
        name: `gbp-politico-${name}-menu`,
      }
    )
  );
};

// Menu de Eleitores
export const useEleitoresMenu = createMenuStore('eleitores');

// Menu de Atendimentos
export const useAtendimentosMenu = createMenuStore('atendimentos');

// Menu de Documentos
export const useDocumentosMenu = createMenuStore('documentos');

// Menu de Configurações
export const useConfiguracoesMenu = createMenuStore('configuracoes');

// Dados iniciais para cada menu
export const eleitoresMenuData: MenuSection[] = [
  {
    id: 'gerenciamento',
    title: 'Gerenciamento',
    items: [
      {
        id: 'lista',
        label: 'Lista de Eleitores',
        path: '/app/eleitores',
        icon: 'Users',
      },
      {
        id: 'cadastro',
        label: 'Novo Eleitor',
        path: '/app/eleitores/new',
        icon: 'UserPlus',
      },
      {
        id: 'importacao',
        label: 'Importar Eleitores',
        path: '/app/eleitores/import',
        icon: 'Upload',
      },
    ],
  },
  {
    id: 'analise',
    title: 'Análise',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/app/eleitores/dashboard',
        icon: 'BarChart2',
      },
      {
        id: 'relatorios',
        label: 'Relatórios',
        path: '/app/eleitores/reports',
        icon: 'FileText',
      },
    ],
  },
];

export const atendimentosMenuData: MenuSection[] = [
  {
    id: 'gerenciamento',
    title: 'Gerenciamento',
    items: [
      {
        id: 'lista',
        label: 'Lista de Atendimentos',
        path: '/app/atendimentos',
        icon: 'List',
      },
      {
        id: 'novo',
        label: 'Novo Atendimento',
        path: '/app/atendimentos/new',
        icon: 'Plus',
      },
      {
        id: 'agenda',
        label: 'Agenda',
        path: '/app/atendimentos/agenda',
        icon: 'Calendar',
      },
    ],
  },
  {
    id: 'analise',
    title: 'Análise',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/app/atendimentos/dashboard',
        icon: 'BarChart2',
      },
      {
        id: 'relatorios',
        label: 'Relatórios',
        path: '/app/atendimentos/reports',
        icon: 'FileText',
      },
    ],
  },
];

export const documentosMenuData: MenuSection[] = [
  {
    id: 'gerenciamento',
    title: 'Gerenciamento',
    items: [
      {
        id: 'lista',
        label: 'Lista de Documentos',
        path: '/app/documentos',
        icon: 'Files',
      },
      {
        id: 'novo',
        label: 'Novo Documento',
        path: '/app/documentos/new',
        icon: 'FilePlus',
      },
      {
        id: 'modelos',
        label: 'Modelos',
        path: '/app/documentos/templates',
        icon: 'FileText',
      },
    ],
  },
  {
    id: 'analise',
    title: 'Análise',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/app/documentos/dashboard',
        icon: 'BarChart2',
      },
      {
        id: 'relatorios',
        label: 'Relatórios',
        path: '/app/documentos/reports',
        icon: 'FileText',
      },
    ],
  },
];

export const configuracoesMenuData: MenuSection[] = [
  {
    id: 'sistema',
    title: 'Sistema',
    items: [
      {
        id: 'perfil',
        label: 'Perfil',
        path: '/app/configuracoes/profile',
        icon: 'User',
      },
      {
        id: 'usuarios',
        label: 'Usuários',
        path: '/app/configuracoes/users',
        icon: 'Users',
      },
      {
        id: 'permissoes',
        label: 'Permissões',
        path: '/app/configuracoes/permissions',
        icon: 'Shield',
      },
    ],
  },
  {
    id: 'personalizacao',
    title: 'Personalização',
    items: [
      {
        id: 'aparencia',
        label: 'Aparência',
        path: '/app/configuracoes/appearance',
        icon: 'Palette',
      },
      {
        id: 'notificacoes',
        label: 'Notificações',
        path: '/app/configuracoes/notifications',
        icon: 'Bell',
      },
    ],
  },
];
