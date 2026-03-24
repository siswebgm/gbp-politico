import { create } from 'zustand';
import { AuthData } from '../services/auth';

interface AuthStore {
  isAuthenticated: boolean;
  user: AuthData | null;
  setUser: (user: AuthData | null) => void;
  logout: () => void;
}

const safeReadStoredUser = (): AuthData | null => {
  try {
    const raw = localStorage.getItem('gbp_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthData | null;
    return parsed || null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: safeReadStoredUser(),
  isAuthenticated: !!safeReadStoredUser(),
  setUser: (user) => {
    if (user) {
      try {
        localStorage.setItem('gbp_user', JSON.stringify(user));
      } catch {
        // ignore
      }
      set({ user, isAuthenticated: true });
    } else {
      try {
        localStorage.removeItem('gbp_user');
      } catch {
        // ignore
      }
      set({ user: null, isAuthenticated: false });
    }
  },
  logout: () => {
    try {
      localStorage.removeItem('gbp_user');
      localStorage.removeItem('empresa_uid');
      localStorage.removeItem('user_uid');
      localStorage.removeItem('supabase.auth.token');
    } catch {
      // ignore
    }
    set({ user: null, isAuthenticated: false });
  },
}));