import { useState, useEffect } from 'react';
import { User } from '../types/user';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const sessionStr = localStorage.getItem('supabase.auth.token');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (new Date(session.expires_at) > new Date()) {
          const userStr = localStorage.getItem('gbp_user');
          if (userStr) {
            setUser(JSON.parse(userStr));
          }
        } else {
          // Sessão expirada
          await signOut();
        }
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('gbp_user');
    localStorage.removeItem('empresa_uid');
    localStorage.removeItem('user_uid');
    setUser(null);
  };

  return {
    user,
    loading,
    signOut
  };
}
