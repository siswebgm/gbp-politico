import React, { useState } from 'react';
import { Link, useNavigate, useLocation, To } from 'react-router-dom';
import { 
  X, 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  Calendar, 
  BarChart, 
  FileText, 
  Send, 
  Map, 
  Target, 
  Users2, 
  Settings,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMenuItems } from '../../hooks/useMenuItems';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();

  const [showPesquisaSubmenu, setShowPesquisaSubmenu] = useState(true);

  const menuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      href: '/app',
      adminOnly: false
    },
    {
      title: 'Eleitores',
      icon: Users,
      href: '/app/eleitores',
      adminOnly: false
    },
    {
      title: 'Atendimentos',
      icon: CalendarCheck,
      path: '/app/atendimentos',
      adminOnly: false
    },
    {
      title: 'Agenda',
      icon: Calendar,
      path: '/agenda',
      adminOnly: false
    },
    {
      title: 'Resultados Eleitorais',
      icon: BarChart,
      path: '/app/resultados-eleitorais',
      adminOnly: true
    },
    {
      title: 'Nova Pesquisa',
      icon: Search,
      path: '/app/pesquisas/nova',
      adminOnly: true
    },
    {
      title: 'Listar Pesquisas',
      icon: Search,
      path: '/app/pesquisas',
      adminOnly: true
    },
    {
      title: 'Relatórios de Pesquisa',
      icon: Search,
      path: '/app/pesquisas/relatorios',
      adminOnly: true
    },
    {
      title: 'Documentos',
      icon: FileText,
      href: '/app/documentos',
      adminOnly: true
    },
    {
      title: 'Disparo de Mídia',
      icon: Send,
      href: '/app/disparo-de-midia',
      adminOnly: true
    },
    {
      title: 'Mapa Eleitoral',
      icon: Map,
      href: '/app/mapa-eleitoral',
      adminOnly: true
    },
    {
      title: 'Metas',
      icon: Target,
      href: '/app/metas',
      adminOnly: false
    },
    {
      title: 'Usuários',
      icon: Users2,
      href: '/app/usuarios',
      adminOnly: true
    },
    {
      title: 'Configurações',
      icon: Settings,
      href: '/app/configuracoes',
      adminOnly: true
    }
  ];

  const handleClick = (path: string) => {
    // Adiciona o prefixo /app se o caminho não começar com ele
    const fullPath = path.startsWith('/app') ? path : `/app${path}`;
    navigate(fullPath);
    if (window.innerWidth < 1024) { // lg breakpoint
      onClose();
    }
  };

  return (
    <aside className={cn(
      "fixed top-0 left-0 z-40 w-64 h-screen pt-20 pb-4 transition-transform bg-white border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="h-full px-3 pb-4 overflow-y-auto bg-white dark:bg-gray-800">
        <ul className="space-y-2 font-medium">
          {menuItems.map((item, index) => {
            const isAdmin = user?.nivel_acesso === 'admin';
            const isDisabled = item.adminOnly && !isAdmin;
            const isActive = location.pathname === (item.path || item.href);
            
            return (
              <React.Fragment key={index}>
                <li>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Link
                          to={isDisabled ? '#' as To : (item.path as To || item.href as To)}
                          onClick={(e) => {
                            if (isDisabled) {
                              e.preventDefault();
                              toast.showToast({
                                type: 'error',
                                title: 'Acesso Restrito',
                                description: 'Esta funcionalidade é exclusiva para administradores',
                              });
                            }
                            // Removido o comportamento de toggle do submenu
                          }}
                          className={cn(
                            'flex items-center p-2 text-gray-900 rounded-lg dark:text-white group relative',
                            isActive && 'bg-gray-100 dark:bg-gray-700',
                            !isActive && 'hover:bg-gray-100 dark:hover:bg-gray-700',
                            isDisabled && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <item.icon className="w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
                          <span className="ml-3">{item.title}</span>
                          {!item.isSubmenu && item.adminOnly && (
                            <span className="ml-auto text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 px-2 py-0.5 rounded-full">
                              Admin
                            </span>
                          )}
                        </Link>
                      </div>
                    </TooltipTrigger>
                    {isDisabled && (
                      <TooltipContent>
                        <p>Acesso restrito a administradores</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </li>

                      const isSubActive = location.pathname === subItem.path;
                      return (
                        <li key={`${index}-${subIndex}`} className="mt-1">
                          <Link
                            to={subItem.path}
                            className={cn(
                              'flex items-center p-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700',
                              isSubActive && 'text-blue-600 dark:text-blue-400 font-medium'
                            )}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2"></span>
                            {subItem.title}
                          </Link>
                        </li>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}
          <li>
            <Link
              to="/app/configuracoes/tipos-demanda"
              className={cn(
                location.pathname === '/app/configuracoes/tipos-demanda'
                  ? "bg-gray-100 dark:bg-gray-700"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700",
                "block px-4 py-2 text-sm text-gray-700 dark:text-gray-200"
              )}
            >
              Tipos de Demanda
            </Link>
          </li>
        </ul>
      </div>
    </aside>
  );
}
