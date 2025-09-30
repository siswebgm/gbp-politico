import { create } from 'zustand';
import { supabaseClient } from '../lib/supabase';

export interface User {
  uid: string;
  nome: string;
  email: string;
  cargo: string;
  empresa_uid: string;
  auth_id: string;
  created_at: string;
  notification_token?: string | null;
  notification_status?: string | null;
  notification_updated_at?: string | null;
  permissoes?: string[];
  contato?: string | null;
  foto?: string | null;
  nivel_acesso?: string | null;
  status?: string | null;
  ultimo_acesso?: string | null;
}

interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
  checkUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  
  setUser: (user) => set({ user }),
  
  checkUser: async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
      
      if (authError || !authUser) {
        console.error('Erro ao buscar usuário autenticado:', authError);
        set({ user: null });
        return;
      }

      console.log('Auth User:', authUser);

      const { data: userData, error: userError } = await supabaseClient
        .from('gbp_usuarios')
        .select('*')
        .eq('auth_id', authUser.id)
        .single();

      if (userError || !userData) {
        console.error('Erro ao buscar dados do usuário:', userError);
        set({ user: null });
        return;
      }

      // Verifica se o usuário tem uma empresa associada
      if (!userData.empresa_uid) {
        console.error('Usuário sem empresa associada:', userData);
        set({ user: null });
        return;
      }

      console.log('User Data:', userData);
      console.log('Empresa UID:', userData.empresa_uid);
      console.log('============================');

      set({ user: userData });
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
      set({ user: null });
    }
  },
  
  signOut: async () => {
    try {
      await supabaseClient.auth.signOut();
      set({ user: null });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }
})); 