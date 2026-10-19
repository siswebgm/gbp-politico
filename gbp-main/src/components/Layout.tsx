import { Outlet } from 'react-router-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from 'react-error-boundary';
import { Menu, User, Settings, LogOut, Building, CheckCircle2, Sun, Moon } from 'lucide-react';

import { useAuth } from '../providers/AuthProvider';
import { useState, useEffect, useRef } from 'react';
import { NotificationBell } from './NotificationBell';
import { supabaseClient } from '../lib/supabase';
import { useNotificationSetup } from '../hooks/useNotificationSetup';
import { useToast } from "./ui/use-toast";
import { UserProfileModal } from './UserProfileModal';
import { AppAssistant } from './AppAssistant';
import { WhatsAppStatusAlert } from './WhatsAppStatusAlert';
import { useCompanyStore } from '../store/useCompanyStore';
import { useThemeStore } from '../store/useThemeStore';
import {
  checkCompanyStatus,
  getCachedCompanyStatus,
  CompanyStatusResult,
} from '../services/companyStatus';

// Hook personalizado para verificar o status da empresa.
// Gate: retorna `ready` — o Layout só renderiza o app após o primeiro check.
// Fail-open: em erro/timeout o acesso é liberado (evita travar por instabilidade).
const useCheckCompanyStatus = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const warnedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const checkRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  // Auth do app é customizada (gbp_user) — não há sessão supabase.auth
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const applyVerdict = async (result: CompanyStatusResult) => {
      if (cancelled) return;

      // Vínculo encerrado: bloqueio silencioso — vai para /encerrado
      if (result.status === 'inactive') {
        if (result.nome) {
          localStorage.setItem('encerrado_empresa', result.nome);
        }
        localStorage.setItem('encerrado_empresa_uid', result.empresaUid);
        localStorage.removeItem('gbp_user');
        localStorage.removeItem('empresa_uid');
        localStorage.removeItem('active_empresa_uid');
        localStorage.removeItem('user_uid');
        await supabaseClient.auth.signOut().catch(() => {});
        navigate('/encerrado', { replace: true });
        return;
      }

      if (result.status === 'suspended') {
        toast({
          title: 'Acesso Suspenso',
          description: `O acesso à empresa ${result.nome || ''} foi suspenso. Entre em contato com o suporte para mais informações.`,
          variant: 'destructive',
          duration: 8000,
        });
        await supabaseClient.auth.signOut();
        navigate('/login');
        return;
      }

      if (result.status === 'blocked') {
        if (!warnedRef.current) {
          warnedRef.current = true;
          toast({
            title: 'Acesso bloqueado',
            description: `A assinatura da empresa ${result.nome || ''} está vencida. Regularize o pagamento para liberar o acesso.`,
            variant: 'warning',
            duration: 8000,
          });
        }
        if (location.pathname !== '/bloqueado') {
          navigate('/bloqueado', { replace: true });
        }
        return;
      }

      // active | unknown (fail-open): libera o app
      warnedRef.current = false;
      setReady(true);
    };

    const checkStatus = async (forceFresh = false) => {
      try {
        if (!user?.uid) {
          setReady(true);
          return;
        }

        let empresaUid =
          localStorage.getItem('active_empresa_uid') ||
          localStorage.getItem('empresa_uid');

        // Fallback: vínculo do usuário quando não há seleção em storage
        if (!empresaUid) {
          const { data: userData } = await supabaseClient
            .from('gbp_usuarios')
            .select('empresa_uid')
            .eq('uid', user.uid)
            .single();
          empresaUid = userData?.empresa_uid || null;
        }

        if (!empresaUid) {
          setReady(true);
          return;
        }

        // Fast path: cache válido dizendo "active" → libera na hora e
        // revalida em background (sem bloquear a tela)
        if (!forceFresh) {
          const cached = getCachedCompanyStatus(empresaUid);
          if (cached?.status === 'active') {
            setReady(true);
            const fresh = await checkCompanyStatus(empresaUid);
            await applyVerdict(fresh);
            return;
          }
          // Cache não-ativo NÃO é confiável para expulsar — revalida antes
        }

        const result = await checkCompanyStatus(empresaUid);
        await applyVerdict(result);
      } catch (error) {
        console.error('Erro ao verificar status da empresa:', error);
        setReady(true); // fail-open
      }
    };

    checkRef.current = checkStatus;
    checkStatus();
    const interval = setInterval(() => checkStatus(), 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [navigate, location.pathname, toast, user?.uid]);

  // Realtime: bloqueio instantâneo quando o admin altera a empresa —
  // não depende do polling de 5 min
  useEffect(() => {
    const empresaUid =
      localStorage.getItem('active_empresa_uid') ||
      localStorage.getItem('empresa_uid');
    if (!user?.uid || !empresaUid) return;

    const channel = supabaseClient
      .channel(`empresa-status-${empresaUid}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gbp_empresas',
          filter: `uid=eq.${empresaUid}`,
        },
        () => {
          void checkRef.current(true);
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [user?.uid]);

  return ready;
};

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900">Algo deu errado</h2>
        <p className="mt-2 text-sm text-gray-500">{error.message}</p>
      </div>
    </div>
  );
}

export function Layout() {
  const statusReady = useCheckCompanyStatus();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [companyPlan, setCompanyPlan] = useState<string | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [versionInfo, setVersionInfo] = useState<{ version: string; buildDate: string } | null>(null);
  const { user } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDarkMode, toggleTheme, loadUserTheme } = useThemeStore();

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useNotificationSetup();

  useEffect(() => {
    // Buscar informações de versão
    fetch('/version.json')
      .then(res => res.json())
      .then(data => setVersionInfo(data))
      .catch(() => setVersionInfo(null));
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          // Carregar tema do usuário
          await loadUserTheme(user.uid);
          
          // Buscar dados do usuário diretamente da tabela gbp_usuarios
          const { data: userData, error } = await supabaseClient
            .from('gbp_usuarios')
            .select('foto, empresa_uid')
            .eq('uid', user.uid)
            .single();

          if (!error && userData) {
            setUserPhoto(userData.foto);

            const activeEmpresaUid = localStorage.getItem('active_empresa_uid') || userData.empresa_uid;
            // Se tiver empresa_uid, buscar dados da empresa
            if (activeEmpresaUid) {
              const { data: companyData, error: companyError } = await supabaseClient
                .from('gbp_empresas')
                .select('plano')
                .eq('uid', activeEmpresaUid)
                .single();

              if (!companyError && companyData) {
                setCompanyPlan(companyData.plano);
              }
            }
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
        }
      }
    };

    fetchUserData();
  }, [user?.uid, loadUserTheme]);

  const handleLogout = async () => {
    try {
      // Limpar todos os dados do localStorage
      localStorage.clear();
      
      // Limpar dados específicos
      localStorage.removeItem('gbp_user');
      localStorage.removeItem('empresa_uid');
      localStorage.removeItem('user_uid');
      localStorage.removeItem('supabase.auth.token');
      
      // Limpar cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Limpar cache de autenticação do Supabase
      await supabaseClient.auth.signOut();
      
      // Limpar estados locais
      setUserPhoto(null);
      setCompanyPlan(null);
      setIsProfileDropdownOpen(false);
      
      // Feedback visual
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
        variant: "success",
        duration: 3000,
      });

      // Redirecionar para login com replace para evitar voltar com o botão do navegador
      navigate('/login', { replace: true });
      
      // Recarregar a página para garantir limpeza completa
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast({
        title: "Erro ao fazer logout",
        description: "Ocorreu um erro ao tentar desconectar.",
        variant: "warning",
        duration: 5000
      });
    }
  };

  // Gate: não renderiza o app (nem dispara queries das páginas filhas)
  // até a primeira verificação de status da empresa concluir.
  if (!statusReady) {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700">
        {/* Marca d'água decorativa */}
        <img
          src="https://8a9fa808ea18d066080b81b1741b3afc.cdn.bubble.io/f1683656885399x827876060621908000/gbp%20politico.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-24 h-96 w-96 rounded-full object-cover opacity-[0.07] blur-sm"
        />
        <img
          src="https://8a9fa808ea18d066080b81b1741b3afc.cdn.bubble.io/f1683656885399x827876060621908000/gbp%20politico.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full object-cover opacity-[0.05] blur-sm"
        />

        <div className="relative flex flex-col items-center gap-6 px-6">
          {/* Logo com anel pulsante */}
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-cyan-400/30 animate-ping" />
            <span className="absolute -inset-2 rounded-full border border-white/20" />
            <img
              src="https://8a9fa808ea18d066080b81b1741b3afc.cdn.bubble.io/f1683656885399x827876060621908000/gbp%20politico.png"
              alt="GBP Político"
              className="relative h-20 w-20 rounded-full object-cover ring-4 ring-white/25 shadow-2xl shadow-blue-950/50"
            />
          </div>

          {/* Marca */}
          <div className="text-center">
            <p className="text-2xl font-bold tracking-tight text-white">
              GBP <span className="text-cyan-300">Político</span>
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.25em] text-blue-200/80">
              Gestão política inteligente
            </p>
          </div>

          {/* Barra shimmer */}
          <div className="h-1 w-48 overflow-hidden rounded-full bg-white/15">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent [animation:gbp-slide_1.2s_ease-in-out_infinite]" />
          </div>

          {/* Texto com pontos animados */}
          <p className="flex items-center gap-1.5 text-sm font-medium text-blue-100">
            Verificando seu acesso
            <span className="flex gap-0.5">
              <span className="h-1 w-1 animate-bounce rounded-full bg-cyan-300" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-cyan-300" style={{ animationDelay: '0.15s' }} />
              <span className="h-1 w-1 animate-bounce rounded-full bg-cyan-300" style={{ animationDelay: '0.3s' }} />
            </span>
          </p>
        </div>

        <style>{`
          @keyframes gbp-slide {
            0% { transform: translateX(-150%); }
            100% { transform: translateX(450%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-blue-600 dark:bg-blue-800 shadow-lg" style={{ paddingTop: 'var(--safe-area-inset-top)' }}>
        <div className="flex h-16 items-center justify-between px-4">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-blue-500"
            >
              <span className="sr-only">Abrir menu lateral</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src="https://8a9fa808ea18d066080b81b1741b3afc.cdn.bubble.io/f1683656885399x827876060621908000/gbp%20politico.png"
                alt="GBP Politico Logo"
                className="h-6 w-auto sm:h-8 object-contain"
              />
              <div className="flex flex-col justify-center">
                <div className="relative flex items-center gap-1">
                  <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">GBP Politico</h1>
                  <img 
                    src="https://studio.gbppolitico.com/storage/v1/object/public/neilton/1757486673276_1757486672945_badge_18365571.png" 
                    alt="Verificado"
                    className="h-4 w-4 ml-1 object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="focus:outline-none focus:ring-2 focus:ring-white/20 rounded-full"
              >
                <div className="relative h-8 w-8">
                  {userPhoto ? (
                    <img
                      src={userPhoto}
                      alt="Foto do usuário"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                  )}
                </div>
              </button>

              {/* Profile Dropdown */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-3 z-50 border border-gray-200 dark:border-gray-700">
                  {/* User Info */}
                  <div className="px-4 py-3">
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 rounded-full overflow-hidden border-4 border-primary-100 dark:border-primary-900">
                        {userPhoto ? (
                          <img
                            src={userPhoto}
                            alt="Foto do perfil"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                            <User className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-gray-900 dark:text-white truncate mb-0.5">
                          {user?.nome}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-0.5">
                          {user?.email}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                          Online
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent my-2"></div>

                  {/* Company Info */}
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/50">
                        <Building className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Empresa Atual
                        </p>
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {company?.nome || user?.empresa_nome}
                          </p>
                          <CheckCircle2 className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                        </div>
                        {!!company?.apelido && (
                          <p className="mt-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 truncate">
                            {company.apelido}
                          </p>
                        )}
                        {companyPlan && (
                          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                            Plano: {companyPlan}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent my-2"></div>

                  {/* Actions */}
                  <div className="px-2 py-2 space-y-1">
                    {user?.adm_empresa === true && (
                      <button
                        onClick={() => {
                          toggleTheme();
                        }}
                        className="w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3 group"
                      >
                        <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
                          {isDarkMode ? <Sun className="h-4 w-4 text-gray-600 dark:text-gray-300" /> : <Moon className="h-4 w-4 text-gray-600 dark:text-gray-300" />}
                        </div>
                        {isDarkMode ? 'Modo claro' : 'Modo escuro'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3 group"
                    >
                      <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
                        <Settings className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      </div>
                      Editar perfil
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-sm text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-3 group"
                    >
                      <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors">
                        <LogOut className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      Sair da conta
                    </button>
                  </div>

                  {/* Versão discreta no rodapé */}
                  {versionInfo && (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-[11px] text-gray-400 dark:text-gray-500 font-mono text-center">
                        v1.0.0 • {new Date(versionInfo.buildDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 h-full" style={{ paddingTop: 'calc(4rem + var(--safe-area-inset-top))' }}>
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main content */}
        <main className="flex-1 min-w-0 h-full" style={{ overflowY: 'auto', overflowX: 'hidden', paddingBottom: 'var(--safe-area-inset-bottom)' }}>
          <div className="app-content w-full flex flex-col px-0 pt-3 lg:px-4 lg:pt-4">
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />

      {['admin', 'coordenador'].includes((user?.nivel_acesso || '').toLowerCase()) && <AppAssistant />}

      {/* Alerta global de WhatsApp desconectado (somente admin) */}
      <WhatsAppStatusAlert />
    </div>
  );
}