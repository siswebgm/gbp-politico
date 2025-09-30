import React, { useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Calendar,
  BarChart3,
  FileText,
  MessageSquare,
  Map,
  Target,
  UserCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: { name: string; href: string }[];
  parent?: string;
}

const RESTRICTED_PATHS = [
  '/app/resultados-eleitorais',
  '/app/disparo-de-midia',
  '/app/mapa-eleitoral',
  '/app/strategy',
  '/app/users',
  '/app/settings',
  '/app/pesquisas'
];

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Eleitores', href: '/app/eleitores', icon: Users },
  { name: 'Atendimentos', href: '/app/atendimentos', icon: CalendarCheck },
  { name: 'Agenda', href: '/app/agenda', icon: Calendar },
  { 
    name: 'Resultados Eleitorais', 
    href: '/app/resultados-eleitorais', 
    icon: BarChart3,
  },
  { 
    name: 'Pesquisas', 
    href: '/app/pesquisas', 
    icon: Search,
    items: [
      { name: 'Nova Pesquisa', href: '/app/pesquisas/nova' },
      { name: 'Listar Pesquisas', href: '/app/pesquisas' },
      { name: 'Relatórios', href: '/app/pesquisas/relatorios' }
    ]
  },
  { name: 'Documentos', href: '/app/documentos', icon: FileText },
  { name: 'Disparo de Mídia', href: '/app/disparo-de-midia', icon: MessageSquare },
  { name: 'Mapa Eleitoral', href: '/app/mapa-eleitoral', icon: Map },
  { name: 'Estratégia', href: '/app/strategy', icon: Target },
  { name: 'Usuários', href: '/app/users', icon: UserCircle },
  { name: 'Configurações', href: '/app/settings', icon: Settings },
];

interface MenuItemProps {
  item: NavigationItem;
  isActive: boolean;
  isCollapsed: boolean;
  isParent: boolean;
  expanded: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onClick: () => void;
}

const MenuItem = React.memo(function MenuItem({ 
  item, 
  isActive, 
  isCollapsed, 
  isParent, 
  expanded, 
  onToggle, 
  onClick 
}: MenuItemProps) {
  return (
    <div className="mb-1">
      <div 
        className={`flex items-center ${
          isCollapsed 
            ? 'justify-center w-12 h-10 mx-auto' 
            : 'px-4 py-1.5'
        } rounded-lg text-sm font-medium transition-all duration-200 group hover:scale-[1.02] ${
          isActive
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-800/50 dark:text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50'
        }`}
      >
        <Link
          to={item.href}
          onClick={onClick}
          className={`flex-1 flex items-center ${item.parent ? 'pl-8' : ''}`}
        >
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-transform duration-200 ${
            isActive 
              ? 'text-blue-600 dark:text-white' 
              : 'text-gray-400 dark:text-gray-400 group-hover:scale-110 group-hover:text-blue-500 dark:group-hover:text-blue-400'
          }`}>
            <item.icon className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <span className="truncate flex-1 ml-3">
              {item.name}
            </span>
          )}
        </Link>
        
        {isParent && !isCollapsed && (
          <button
            onClick={onToggle}
            className="ml-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={expanded ? 'Recolher' : 'Expandir'}
          >
            <ChevronRight 
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                expanded ? 'transform rotate-90' : ''
              }`} 
            />
          </button>
        )}
      </div>
    </div>
  );
});

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.nivel_acesso === 'admin';
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set(['/app/pesquisas']));

  const toggleItem = useCallback((href: string) => {
    setExpandedItems(prev => new Set(prev.has(href) ? [...prev].filter(item => item !== href) : [...prev, href]));
  }, []);

  const filteredNavigation = useMemo(() => {
    if (isAdmin) return navigation;
    
    return navigation.filter(item => 
      !RESTRICTED_PATHS.includes(item.href) && 
      !RESTRICTED_PATHS.some(path => item.href.startsWith(path))
    );
  }, [isAdmin]);

  const handleMobileClose = useCallback(() => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  }, [onClose]);

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" 
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] bg-white dark:bg-gray-800 shadow-lg z-30 transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'w-64'}`}
      >
        <nav className="flex flex-col h-full">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:block absolute top-4 -right-3 p-1.5 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg dark:hover:bg-gray-700/50 transition-all duration-200 group"
            aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 dark:text-gray-500 dark:group-hover:text-blue-400" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-400 group-hover:text-blue-500 dark:text-gray-500 dark:group-hover:text-blue-400" />
            )}
          </button>

          <div className={`flex-1 overflow-y-auto py-4 ${isCollapsed ? 'px-2' : 'px-3'}`}>
            <div className={isCollapsed ? 'space-y-2' : 'space-y-1'}>
              {filteredNavigation.map((item) => {
                const isActive = item.href === '/app' 
                  ? location.pathname === '/app' || location.pathname === '/app/'
                  : location.pathname.startsWith(item.href);

                const isParent = navigation.some(navItem => navItem.parent === item.href);

                return (
                  <MenuItem
                    key={item.href}
                    item={item}
                    isActive={isActive}
                    isCollapsed={isCollapsed}
                    isParent={isParent}
                    expanded={!!expandedItems[item.href]}
                    onToggle={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      toggleItem(item.href);
                    }}
                    onClick={handleMobileClose}
                  />
                );
              })}
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}