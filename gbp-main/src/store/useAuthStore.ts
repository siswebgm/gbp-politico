import { create } from 'zustand';
import { AuthData } from '../services/auth';

interface AuthStore {
  isAuthenticated: boolean;
  user: AuthData | null;
  setUser: (user: AuthData | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: !!localStorage.getItem('gbp_user'),
  user: JSON.parse(localStorage.getItem('gbp_user') || 'null'),
  setUser: (user) => {
    if (user) {
      localStorage.setItem('gbp_user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } else {
      localStorage.removeItem('gbp_user');
      set({ user: null, isAuthenticated: false });
    }
  },
  logout: () => {
    localStorage.removeItem('gbp_user');
    localStorage.removeItem('empresa_uid');
    localStorage.removeItem('user_uid');
    localStorage.removeItem('supabase.auth.token');
    set({ user: null, isAuthenticated: false });
  },
}));