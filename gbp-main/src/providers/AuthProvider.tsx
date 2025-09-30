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

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const LoadingSpinner = () => (
  <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center">
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

  // Monitor de conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Ao voltar online, tenta recarregar os dados
      const storedUser = localStorage.getItem('gbp_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        loadUserData(userData.uid).catch(console.error);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      // Quando offline, mantém os dados do localStorage
      const storedUser = localStorage.getItem('gbp_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
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
        const storedUser = localStorage.getItem('gbp_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
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
          contato,
          status,
          ultimo_acesso,
          created_at,
          foto,
          notification_token,
          notification_status,
          notification_updated_at
        `)
        .eq('uid', uid)
        .single();

      if (error) {
        // Se houver erro de conexão, tenta usar dados do localStorage
        if (error.code === 'NETWORK_ERROR' || !isOnline) {
          const storedUser = localStorage.getItem('gbp_user');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            authStore.setUser(userData);
            return true;
          }
        }
        console.error('Erro ao carregar dados do usuário:', error);
        return false;
      }

      if (!userData) {
        return false;
      }

      // Verifica status apenas quando online
      if (isOnline && userData.status !== 'active') {
        signOut();
        return false;
      }

      authStore.setUser(userData);
      localStorage.setItem('gbp_user', JSON.stringify(userData));

      if (userData.empresa_uid) {
        try {
          const companyData = await loadCompanyData(userData.empresa_uid);
          if (companyData) {
            setCompanyUser({
              ...userData,
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
      const storedUser = localStorage.getItem('gbp_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        authStore.setUser(userData);
        return true;
      }
      return false;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsInitializing(true);
      try {
        const storedUser = localStorage.getItem('gbp_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          if (userData?.uid) {
            await loadUserData(userData.uid);
          }
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();

    // Atualização periódica apenas quando online
    const updateInterval = setInterval(() => {
      if (isOnline) {
        const storedUser = localStorage.getItem('gbp_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          if (userData?.uid) {
            loadUserData(userData.uid).catch(console.error);
          }
        }
      }
    }, 30000);

    return () => {
      clearInterval(updateInterval);
    };
  }, [isOnline]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data: user, error } = await supabaseClient
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
          contato,
          status,
          ultimo_acesso,
          created_at,
          foto,
          notification_token,
          notification_status,
          notification_updated_at
        `)
        .eq('email', email)
        .eq('senha', password)
        .single();

      if (error) {
        throw new Error('Email ou senha incorretos');
      }

      if (!user) {
        throw new Error('Email ou senha incorretos');
      }

      if (user.status !== 'active') {
        throw new Error('Sua conta está inativa. Entre em contato com o administrador.');
      }

      // Atualiza último acesso
      await supabaseClient
        .from('gbp_usuarios')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('uid', user.uid);

      // Atualiza estado global
      authStore.setUser(user);
      localStorage.setItem('gbp_user', JSON.stringify(user));
      localStorage.setItem('empresa_uid', user.empresa_uid || '');
      localStorage.setItem('user_uid', user.uid);

      // Carrega dados da empresa se existir
      if (user.empresa_uid) {
        const companyData = await loadCompanyData(user.empresa_uid);
        if (companyData) {
          setCompanyUser({
            ...user,
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
    localStorage.removeItem('gbp_user');
    localStorage.removeItem('empresa_uid');
    localStorage.removeItem('user_uid');
    localStorage.removeItem('supabase.auth.token');
    
    // Limpar quaisquer outros dados do localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('gbp_') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });

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
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
