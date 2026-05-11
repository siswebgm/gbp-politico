import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Calendar,
  FileText,
  MessageSquare,
  Map,
  Target,
  UserCircle,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertTriangle,
} from 'lucide-react';

import { useAuth } from '../providers/AuthProvider';
import { useCompanyStore } from '../store/useCompanyStore';
import { demandasRuasService } from '../services/demandasRuasService';
import { supabaseClient } from '../lib/supabase';

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
  // { 
  //   name: 'Resultados Eleitorais', 
  //   href: '/app/resultados-eleitorais', 
  //   icon: BarChart3,
  // },
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
  { name: 'Demandas Ruas', href: '/app/documentos/demandas-ruas', icon: AlertTriangle },
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
  badge?: number;
}

const MenuItem = React.memo(function MenuItem({ 
  item, 
  isActive, 
  isCollapsed, 
  isParent, 
  expanded, 
  onToggle, 
  onClick,
  badge
}: MenuItemProps) {
  return (
    <div className="mb-1.5">
      <div 
        className={`flex items-center ${
          isCollapsed 
            ? 'justify-center w-12 h-[34px] mx-auto' 
            : 'px-3 py-[5px]'
        } rounded-lg text-sm font-medium transition-all duration-200 group hover:scale-[1.02] ${
          isActive
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-800/50 dark:text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50'
        }`}
      >
        <Link
          to={item.href}
          onClick={onClick}
          className={`flex-1 flex items-center ${item.parent ? 'pl-8' : ''} relative`}
        >
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-transform duration-200 ${
            isActive 
              ? 'text-blue-600 dark:text-white' 
              : 'text-gray-400 dark:text-gray-400 group-hover:scale-110 group-hover:text-blue-500 dark:group-hover:text-blue-400'
          }`}>
            <item.icon className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <span className="truncate flex-1 ml-3">
              {item.name}
            </span>
          )}
          {badge !== undefined && badge > 0 && (
            <>
              {!isCollapsed ? (
                <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                  {badge}
                </span>
              ) : (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-blue-500 text-white dark:bg-blue-600 shadow-sm">
                  {badge}
                </span>
              )}
            </>
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
  const { company } = useCompanyStore();
  const isAdmin = user?.nivel_acesso === 'admin';
  const canSeeAmbiente = Number((user as any)?.cota_criar_empresas ?? 0) > 0;
  const [demandasHoje, setDemandasHoje] = useState<number>(0);
  const [canSwitchCompany, setCanSwitchCompany] = useState(false);

  // Planos que têm acesso ao módulo de Demandas Ruas
  const planosComAcessoDemandasRuas = [
    'Inter 2.0', 
    'Pró Max 3.0', 
    'Básico Plus 0.4', 
    'Básico 1.0'
  ];
  
  const temAcessoDemandasRuas = company?.plano 
    ? planosComAcessoDemandasRuas.includes(company.plano) 
    : false;
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set(['/app/pesquisas']));

  useEffect(() => {
    let isMounted = true;

    async function checkCanSwitchCompany() {
      if (!user?.uid) {
        if (isMounted) setCanSwitchCompany(false);
        return;
      }

      if (user?.adm_empresa === true) {
        if (isMounted) setCanSwitchCompany(true);
        return;
      }

      try {
        const { count, error } = await supabaseClient
          .from('gbp_usuario_empresas')
          .select('uid', { count: 'exact', head: true })
          .eq('user_uid', user.uid)
          .eq('ativo', true);

        if (error) throw error;
        if (isMounted) setCanSwitchCompany((count || 0) > 0);
      } catch (e) {
        console.error('[Sidebar] Erro ao verificar empresas administráveis:', e);
        if (isMounted) setCanSwitchCompany(false);
      }
    }

    checkCanSwitchCompany();
    return () => {
      isMounted = false;
    };
  }, [user?.uid, user?.adm_empresa]);

  // Buscar contagem de demandas do dia atual
  useEffect(() => {
    const fetchDemandasHoje = async () => {
      console.log(' Verificando acesso a Demandas Ruas:', temAcessoDemandasRuas);
      console.log(' Plano da empresa:', company?.plano);
      console.log(' UID da empresa:', company?.uid);
      
      if (!temAcessoDemandasRuas) {
        console.log(' Sem acesso ao módulo de Demandas Ruas');
        return;
      }
      
      if (!company?.uid) {
        console.log(' Aguardando carregamento da empresa...');
        return;
      }
      
      try {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);

        console.log(' Buscando demandas entre:', hoje.toISOString(), 'e', amanha.toISOString());

        const demandas = await demandasRuasService.getDemandas(company.uid);
        console.log(' Total de demandas:', demandas.length);
        
        const demandasDoDia = demandas.filter(demanda => {
          // Não contar demandas excluídas
          if (demanda.excluido === true) {
            return false;
          }
          
          const dataCriacao = new Date(demanda.criado_em);
          const isDoDia = dataCriacao >= hoje && dataCriacao < amanha;
          
          // Se não for admin, mostrar apenas demandas atribuídas ao usuário
          if (!isAdmin) {
            const isAtribuidaAoUsuario = demanda.atribuido_para_uid?.includes(user?.uid || '');
            if (!isAtribuidaAoUsuario) {
              return false;
            }
          }
          
          if (isDoDia) {
            console.log(' Demanda do dia encontrada:', demanda.uid, dataCriacao.toISOString(), 'atribuída ao usuário:', !isAdmin ? demanda.atribuido_para_uid?.includes(user?.uid || '') : 'admin - todas');
          }
          return isDoDia;
        });
        
        console.log(' Demandas do dia:', demandasDoDia.length);
        setDemandasHoje(demandasDoDia.length);
      } catch (error) {
        console.error(' Erro ao buscar demandas do dia:', error);
      }
    };

    fetchDemandasHoje();
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchDemandasHoje, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [temAcessoDemandasRuas, company?.plano, company?.uid]);

  const toggleItem = useCallback((href: string) => {
    setExpandedItems(prev => new Set(prev.has(href) ? [...prev].filter(item => item !== href) : [...prev, href]));
  }, []);

  const filteredNavigation = useMemo(() => {
    let filtered = navigation;

    if (canSwitchCompany && canSeeAmbiente) {
      const alreadyExists = filtered.some((i) => i.href === '/app/select-company');
      if (!alreadyExists) {
        filtered = [
          ...filtered,
          { name: 'Ambiente', href: '/app/select-company', icon: Building2 },
        ];
      }
    }
    
    // Filtrar por nível de acesso admin
    if (!isAdmin) {
      filtered = filtered.filter(item => 
        !RESTRICTED_PATHS.includes(item.href) && 
        !RESTRICTED_PATHS.some(path => item.href.startsWith(path))
      );
    }
    
    // Filtrar Documentos para visitantes
    filtered = filtered.filter(item => {
      if (item.href === '/app/documentos') {
        // Ocultar Documentos se o usuário for visitante
        return user?.nivel_acesso !== 'visitante';
      }
      return true;
    });

    // Filtrar Demandas Ruas por nível de acesso
    filtered = filtered.filter(item => {
      if (item.href === '/app/documentos/demandas-ruas') {
        // Permitir todos os níveis inclusive visitantes
        return true;
      }
      return true;
    });
    
    return filtered;
  }, [isAdmin, user?.nivel_acesso, temAcessoDemandasRuas, canSwitchCompany, canSeeAmbiente]);

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
        className={`fixed lg:sticky left-0 bg-white dark:bg-gray-800 shadow-lg z-30 transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'w-64'}`}
        style={{
          top: 'calc(4rem + var(--safe-area-inset-top))',
          height: 'calc(100vh - (4rem + var(--safe-area-inset-top)))',
        }}
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

          <div className={`flex-1 overflow-y-auto py-2 ${isCollapsed ? 'px-2' : 'px-3'}`}>
            <div className={isCollapsed ? 'space-y-2' : 'space-y-1.5'}>
              {filteredNavigation.map((item) => {
                // Lógica especial para evitar conflito entre Documentos e Demandas Ruas
                let isActive = false;
                if (item.href === '/app') {
                  isActive = location.pathname === '/app' || location.pathname === '/app/';
                } else if (item.href === '/app/documentos') {
                  // Documentos só fica ativo se não for a rota de demandas-ruas
                  isActive = location.pathname.startsWith('/app/documentos') && 
                             !location.pathname.startsWith('/app/documentos/demandas-ruas');
                } else {
                  isActive = location.pathname.startsWith(item.href);
                }

                const isParent = navigation.some(navItem => navItem.parent === item.href);

                return (
                  <MenuItem
                    key={item.href}
                    item={item}
                    isActive={isActive}
                    isCollapsed={isCollapsed}
                    isParent={isParent}
                    expanded={expandedItems.has(item.href)}
                    onToggle={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      toggleItem(item.href);
                    }}
                    onClick={handleMobileClose}
                    badge={item.href === '/app/documentos/demandas-ruas' ? demandasHoje : undefined}
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