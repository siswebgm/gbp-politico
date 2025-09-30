import { create } from 'zustand';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  Settings, 
  Calendar,
  BarChart,
  FileText,
  Map,
  Target,
  CreditCard
} from 'lucide-react';

export type MenuItem = {
  id: string;
  name: string;
  path: string;
  icon?: string;
  badge?: number;
  subItems?: MenuItem[];
};

type NavigationState = {
  menuExpanded: boolean;
  expandedMenuIds: string[];
  menuItems: MenuItem[];
  // Actions
  toggleMenu: (menuId?: string) => void;
  setMenuExpanded: (expanded: boolean) => void;
  toggleExpandedMenu: (menuId: string) => void;
  isExpanded: (menuId: string) => boolean;
};

export const useNavigationStore = create<NavigationState>()((set, get) => ({
  menuExpanded: false,
  expandedMenuIds: [],
  menuItems: [
    {
      id: 'dashboard',
      name: 'Dashboard',
      path: '/app',
      icon: 'LayoutDashboard'
    },
    {
      id: 'eleitores',
      name: 'Eleitores',
      path: '/app/eleitores',
      icon: 'Users',
      subItems: [
        {
          id: 'eleitores-lista',
          name: 'Lista de Eleitores',
          path: '/app/eleitores',
        },
        {
          id: 'eleitores-novo',
          name: 'Novo Eleitor',
          path: '/app/eleitores/novo',
        }
      ]
    },
    {
      id: 'atendimentos',
      name: 'Atendimentos',
      path: '/app/atendimentos',
      icon: 'CalendarCheck'
    },
    {
      id: 'agenda',
      name: 'Agenda',
      path: '/agenda',
      icon: 'Calendar'
    },
    {
      id: 'resultados',
      name: 'Resultados Eleitorais',
      path: '/app/resultados',
      icon: 'BarChart'
    },
    {
      id: 'documentos',
      name: 'Documentos',
      path: '/app/documentos',
      icon: 'FileText'
    },
    {
      id: 'mapa',
      name: 'Mapa Eleitoral',
      path: '/app/mapa',
      icon: 'Map'
    },
    {
      id: 'metas',
      name: 'Metas',
      path: '/app/metas',
      icon: 'Target'
    },
    {
      id: 'usuarios',
      name: 'Usuários',
      path: '/app/usuarios',
      icon: 'Users'
    },
    {
      id: 'configuracoes',
      name: 'Configurações',
      path: '/app/configuracoes',
      icon: 'Settings'
    }
  ],
  toggleMenu: (menuId?: string) => {
    if (menuId) {
      set((state) => ({
        expandedMenuIds: state.expandedMenuIds.includes(menuId)
          ? state.expandedMenuIds.filter((id) => id !== menuId)
          : [...state.expandedMenuIds, menuId]
      }));
    } else {
      set((state) => ({ menuExpanded: !state.menuExpanded }));
    }
  },
  setMenuExpanded: (expanded) => {
    console.log('Setting menu expanded:', expanded);
    set({ menuExpanded: expanded });
  },
  toggleExpandedMenu: (menuId) =>
    set((state) => ({
      expandedMenuIds: state.expandedMenuIds.includes(menuId)
        ? state.expandedMenuIds.filter((id) => id !== menuId)
        : [...state.expandedMenuIds, menuId]
    })),
  isExpanded: (menuId) => get().expandedMenuIds.includes(menuId)
}));
