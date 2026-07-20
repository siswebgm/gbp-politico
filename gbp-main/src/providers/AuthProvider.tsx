import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyStore } from '../store/useCompanyStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabaseClient } from '../lib/supabase';
import { useToast } from '../components/ui/use-toast';

interface Company {
  uid: string;
  nome: string;
  token?: string | null;
  instancia?: string | null;
  porta?: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  login: (email: string, password: string) => Promise<boolean>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LoadingSpinner = () => (
  <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center pointer-events-none">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
  </div>
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const setCompany = useCompanyStore((state) => state.setCompany);
  const setCompanyUser = useCompanyStore((state) => state.setUser);
  const authStore = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const { toast } = useToast();

  const safeGetLocalStorageItem = (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('[AuthProvider] localStorage.getItem falhou:', key, e);
      return null;
    }
  };

  const safeSetLocalStorageItem = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('[AuthProvider] localStorage.setItem falhou:', key, e);
    }
  };

  const safeRemoveLocalStorageItem = (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[AuthProvider] localStorage.removeItem falhou:', key, e);
    }
  };

  const safeParseJson = <T,>(value: string | null): T | null => {
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      console.warn('[AuthProvider] JSON.parse falhou', e);
      return null;
    }
  };

  // Monitor de conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Ao voltar online, tenta recarregar os dados
      const storedUser = safeGetLocalStorageItem('gbp_user');
      const userData = safeParseJson<{ uid?: string }>(storedUser);
      if (userData?.uid) {
        loadUserData(userData.uid).catch(console.error);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      // Quando offline, mantém os dados do localStorage
      const storedUser = safeGetLocalStorageItem('gbp_user');
      const userData = safeParseJson<any>(storedUser);
      if (userData) {
        authStore.setUser(userData);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Função para carregar dados da empresa
  const loadCompanyData = async (empresaUid: string) => {
    try {
      const { data: companyData, error: companyError } = await supabaseClient
        .from('gbp_empresas')
        .select('*')
        .eq('uid', empresaUid)
        .single();

      if (!companyError && companyData) {
        setCompany(companyData);
        return companyData;
      }
    } catch (error) {
      console.error('Erro ao carregar dados da empresa:', error);
    }
    return null;
  };

  // Função para carregar dados do usuário
  const loadUserData = async (uid: string) => {
    try {
      if (!isOnline) {
        // Se estiver offline, usa dados do localStorage
        const storedUser = safeGetLocalStorageItem('gbp_user');
        const userData = safeParseJson<any>(storedUser);
        if (userData) {
          authStore.setUser(userData);
          return true;
        }
        return false;
      }

      const { data: userData, error } = await supabaseClient
        .from('gbp_usuarios')
        .select(`
          id,
          uid,
          nome,
          email,
          cargo,
          nivel_acesso,
          permissoes,
          empresa_uid,
          cota_criar_empresas,
          contato,
          status,
          ultimo_acesso,
          created_at,
          foto,
          notification_token,
          notification_status,
          notification_updated_at,
          adm_empresa
        `)
        .eq('uid', uid)
        .single();

      if (error) {
        // Se houver erro de conexão, tenta usar dados do localStorage
        if (error.code === 'NETWORK_ERROR' || !isOnline) {
          const storedUser = safeGetLocalStorageItem('gbp_user');
          const userData = safeParseJson<any>(storedUser);
          if (userData) {
            authStore.setUser(userData);
            return true;
          }
        }
        // Se erro PGRST116 (não encontrado), forçar logout
        if (error.code === 'PGRST116' || error.message?.includes('not found')) {
          console.error('[AuthProvider] Usuário não encontrado (PGRST116). Forçando logout.');
          signOut();
          return false;
        }
        console.error('Erro ao carregar dados do usuário:', error);
        return false;
      }

      if (!userData) {
        console.error('[AuthProvider] Usuário não encontrado no banco. Forçando logout.');
        signOut();
        return false;
      }

      // Verifica se o usuário está ativo
      if (userData.status !== 'active') {
        console.error('[AuthProvider] Usuário inativo. Forçando logout.');
        signOut();
        return false;
      }

      const activeEmpresaUid = safeGetLocalStorageItem('active_empresa_uid') || userData.empresa_uid;
      const userWithActiveEmpresa = {
        ...userData,
        empresa_uid: activeEmpresaUid,
      };

      authStore.setUser(userWithActiveEmpresa);
      safeSetLocalStorageItem('gbp_user', JSON.stringify(userWithActiveEmpresa));

      if (activeEmpresaUid) {
        try {
          const companyData = await loadCompanyData(activeEmpresaUid);
          if (companyData) {
            setCompanyUser({
              ...userWithActiveEmpresa,
              foto: userData.foto
            });
          }
        } catch (error) {
          // Se falhar ao carregar dados da empresa, continua com dados do usuário
          console.error('Erro ao carregar dados da empresa:', error);
        }
      }
      return true;
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
      // Em caso de erro, tenta usar dados do localStorage
      const storedUser = safeGetLocalStorageItem('gbp_user');
      const userData = safeParseJson<any>(storedUser);
      if (userData) {
        authStore.setUser(userData);
        return true;
      }
      return false;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsInitializing(true);

      let timedOut = false;
      const hardTimeout = window.setTimeout(() => {
        timedOut = true;
        console.warn('[AuthProvider] Inicialização excedeu tempo limite. Liberando UI.');
        setIsInitializing(false);
      }, 12000);

      try {
        const storedUser = safeGetLocalStorageItem('gbp_user');
        const userData = safeParseJson<{ uid?: string }>(storedUser);
        if (userData?.uid) {
          await Promise.race([
            loadUserData(userData.uid),
            new Promise((resolve) => setTimeout(resolve, 8000)),
          ]);
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
      } finally {
        window.clearTimeout(hardTimeout);
        if (!timedOut) {
          setIsInitializing(false);
        }
      }
    };

    initializeAuth();

    // Atualização periódica apenas quando online
    const updateInterval = setInterval(() => {
      if (isOnline) {
        const storedUser = safeGetLocalStorageItem('gbp_user');
        const userData = safeParseJson<{ uid?: string }>(storedUser);
        if (userData?.uid) {
          loadUserData(userData.uid).catch(console.error);
        }
      }
    }, 30000);

    return () => {
      clearInterval(updateInterval);
    };
  }, [isOnline]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Busca o usuário pelo e-mail primeiro para verificar status e tentativas
      const { data: user, error } = await supabaseClient
        .from('gbp_usuarios')
        .select(`
          id,
          uid,
          nome,
          email,
          senha,
          cargo,
          nivel_acesso,
          permissoes,
          empresa_uid,
          cota_criar_empresas,
          contato,
          status,
          tentativas_login,
          ultimo_acesso,
          created_at,
          foto,
          notification_token,
          notification_status,
          notification_updated_at,
          adm_empresa
        `)
        .eq('email', email)
        .single();

      if (error || !user) {
        throw new Error('Email ou senha incorretos');
      }

      // Conta bloqueada por tentativas excessivas
      if (user.status === 'blocked' || user.status === 'bloqueado') {
        throw new Error('conta_bloqueada');
      }

      // Conta inativa por outro motivo
      if (user.status !== 'active') {
        throw new Error('conta_inativa');
      }

      // Verifica a senha
      if (user.senha !== password) {
        const currentAttempts = (user.tentativas_login || 0) + 1;
        const updates: { tentativas_login: number; status?: string } = {
          tentativas_login: currentAttempts,
        };

        if (currentAttempts >= 3) {
          updates.status = 'blocked';
        }

        await supabaseClient
          .from('gbp_usuarios')
          .update(updates)
          .eq('uid', user.uid);

        if (currentAttempts >= 3) {
          throw new Error('conta_bloqueada');
        }

        const remaining = 3 - currentAttempts;
        throw new Error(
          `Senha incorreta. ${remaining} tentativa${remaining === 1 ? '' : 's'} restante${remaining === 1 ? '' : 's'} antes do bloqueio.`
        );
      }

      // Login correto — zera tentativas e atualiza último acesso
      await supabaseClient
        .from('gbp_usuarios')
        .update({ tentativas_login: 0, ultimo_acesso: new Date().toISOString() })
        .eq('uid', user.uid);

      // Atualiza estado global
      const activeEmpresaUid = safeGetLocalStorageItem('active_empresa_uid') || user.empresa_uid || '';
      const userWithActiveEmpresa = {
        ...user,
        empresa_uid: activeEmpresaUid,
      };

      authStore.setUser(userWithActiveEmpresa);
      safeSetLocalStorageItem('gbp_user', JSON.stringify(userWithActiveEmpresa));
      safeSetLocalStorageItem('empresa_uid', activeEmpresaUid);
      safeSetLocalStorageItem('user_uid', user.uid);

      // Carrega dados da empresa se existir
      if (activeEmpresaUid) {
        const companyData = await loadCompanyData(activeEmpresaUid);
        if (companyData) {
          setCompanyUser({
            ...userWithActiveEmpresa,
            foto: user.foto
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const signOut = () => {
    authStore.logout();
    setCompany(null);
    setCompanyUser(null);
    safeRemoveLocalStorageItem('gbp_user');
    safeRemoveLocalStorageItem('empresa_uid');
    safeRemoveLocalStorageItem('active_empresa_uid');
    safeRemoveLocalStorageItem('user_uid');
    safeRemoveLocalStorageItem('supabase.auth.token');
    
    // Limpar quaisquer outros dados do localStorage
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('gbp_') || key.includes('supabase')) {
          safeRemoveLocalStorageItem(key);
        }
      });
    } catch (e) {
      console.warn('[AuthProvider] Falha ao iterar localStorage durante signOut', e);
    }

    // Redirecionar para login
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authStore.isAuthenticated,
        isLoading: false,
        user: authStore.user,
        login,
        signOut,
      }}
    >
      {isInitializing ? <LoadingSpinner /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
