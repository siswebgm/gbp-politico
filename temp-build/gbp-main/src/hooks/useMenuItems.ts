import { useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Map,
  BarChart2,
  Target,
  BarChart,
  UserCog,
  Settings,
  Send,
  CreditCard,
  CalendarCheck
} from 'lucide-react';
import { useCompanyStore } from '../store/useCompanyStore';
import { useAuth } from '../hooks/useAuth';

export interface MenuItem {
  name: string;
  icon: any;
  path: string;
  permission?: string;
  isGroup?: boolean;
  children?: MenuItem[];
  adminOnly?: boolean;
}

export function useMenuItems() {
  const company = useCompanyStore((state) => state.company);
  const { user } = useAuth();
  
  const menuItems = useMemo(() => {
    console.log('[DEBUG] Generating menu items');
    
    const isAdmin = user?.nivel_acesso === 'admin';
    
    const items: MenuItem[] = [
      {
        name: 'Dashboard',
        icon: LayoutDashboard,
        path: '/app',
        permission: 'dashboard.view',
        adminOnly: false
      },
      {
        name: 'Eleitores',
        icon: Users,
        path: '/app/eleitores',
        permission: 'eleitores.view',
        adminOnly: false
      },
      {
        name: 'Atendimentos',
        icon: CalendarCheck,
        path: '/app/atendimentos',
        permission: 'atendimentos.view',
        isGroup: false,
        children: [],
        adminOnly: false
      },
      {
        name: 'Agenda',
        icon: Calendar,
        path: '/app/agenda',
        permission: 'agenda.view',
        adminOnly: false
      },
      {
        name: 'Resultados Eleitorais',
        icon: BarChart2,
        path: '/app/resultados-eleitorais',
        permission: 'resultados.view',
        adminOnly: true
      },
      {
        name: 'Documentos',
        icon: FileText,
        path: '/app/documentos',
        permission: 'documentos.view',
        adminOnly: true
      },
      {
        name: 'Disparo de Mídia',
        icon: Send,
        path: '/app/disparo-de-midia',
        permission: 'disparo-midia.view',
        adminOnly: true
      },
      {
        name: 'Mapa Eleitoral',
        icon: Map,
        path: '/app/mapa-eleitoral',
        permission: 'mapa.view',
        adminOnly: true
      },
      {
        name: 'Metas',
        icon: Target,
        path: '/app/metas',
        permission: 'metas.view',
        adminOnly: false
      },
      {
        name: 'Usuários',
        icon: UserCog,
        path: '/app/usuarios',
        permission: 'usuarios.view',
        adminOnly: true
      },
      {
        name: 'Configurações',
        icon: Settings,
        path: '/app/configuracoes',
        permission: 'configuracoes.view',
        adminOnly: true
      }
    ];

    // Filtra os itens baseado no nível de acesso
    return items.filter(item => !item.adminOnly || isAdmin);
  }, [user]);

  return menuItems;
}
