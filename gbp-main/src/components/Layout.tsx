import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from 'react-error-boundary';
import { Menu, User, Settings, LogOut, Building, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { useState, useEffect, useRef } from 'react';
import { NotificationBell } from './NotificationBell';
import { supabaseClient } from '../lib/supabase';
import { useNotificationSetup } from '../hooks/useNotificationSetup';
import { useToast } from "./ui/use-toast";
import { UserProfileModal } from './UserProfileModal';
import { useCompanyStore } from '../store/useCompanyStore';

// Hook personalizado para verificar o status da empresa
const useCheckCompanyStatus = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user?.id) return;

        // Busca o usuário para obter o empresa_uid
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select('empresa_uid')
          .eq('uid', user.id)
          .single();

        if (userError) throw userError;
        if (!userData?.empresa_uid) return;

        // Verifica o status da empresa
        const { data: empresaData, error: empresaError } = await supabaseClient
          .from('gbp_empresas')
          .select('status, nome')
          .eq('uid', userData.empresa_uid)
          .single();

        if (empresaError) throw empresaError;

        // Se o status for 'suspended', faz logout e redireciona
        if (empresaData?.status === 'suspended') {
          toast({
            title: "Acesso Suspenso",
            description: `O acesso à empresa ${empresaData.nome || ''} foi suspenso. Entre em contato com o suporte para mais informações.`,
            variant: "destructive",
            duration: 5000
          });
          
          await supabaseClient.auth.signOut();
          navigate('/login');
        }
      } catch (error) {
        console.error('Erro ao verificar status da empresa:', error);
      }
    };

    // Verifica imediatamente e a cada 5 minutos
    checkStatus();
    const interval = setInterval(checkStatus, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [navigate, toast]);
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
  useCheckCompanyStatus();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [companyPlan, setCompanyPlan] = useState<string | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { user } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const navigate = useNavigate();
  const { toast } = useToast();

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
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          // Buscar dados do usuário diretamente da tabela gbp_usuarios
          const { data: userData, error } = await supabaseClient
            .from('gbp_usuarios')
            .select('foto, empresa_uid')
            .eq('uid', user.uid)
            .single();

          if (!error && userData) {
            setUserPhoto(userData.foto);

            // Se tiver empresa_uid, buscar dados da empresa
            if (userData.empresa_uid) {
              const { data: companyData, error: companyError } = await supabaseClient
                .from('gbp_empresas')
                .select('plano')
                .eq('uid', userData.empresa_uid)
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
  }, [user?.uid]);

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
        variant: "destructive",
        duration: 5000
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 md:overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-blue-600 dark:bg-blue-800 shadow-lg">
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
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 pt-16 h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto h-full">
          <div className="w-full h-full px-0 py-3 lg:px-4 lg:py-4">
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

    </div>
  );
}