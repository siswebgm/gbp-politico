import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabaseClient } from '../lib/supabase';

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  loadUserTheme: (userId: string) => Promise<void>;
  saveUserTheme: (userId: string, isDark: boolean) => Promise<void>;
  isTemaColumnAvailable: boolean;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDarkMode: false,
      isTemaColumnAvailable: true,
      
      setTheme: (isDark: boolean) => set({ isDarkMode: isDark }),
      
      toggleTheme: async () => {
        const newTheme = !get().isDarkMode;
        set({ isDarkMode: newTheme });
        
        // Tentar salvar no banco de dados
        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user?.id) {
            await get().saveUserTheme(user.id, newTheme);
          }
        } catch (error) {
          console.error('Erro ao salvar tema:', error);
        }
      },
      
      loadUserTheme: async (userId: string) => {
        if (!get().isTemaColumnAvailable) return;
        try {
          const { data, error } = await supabaseClient
            .from('gbp_usuarios')
            .select('tema')
            .eq('uid', userId)
            .single();

          if (error) {
            const msg = String((error as any)?.message || '');
            if (msg.toLowerCase().includes('tema') && msg.toLowerCase().includes('column')) {
              set({ isTemaColumnAvailable: false });
              return;
            }
            throw error;
          }
          
          if (data) {
            const isDark = data.tema === 'dark';
            set({ isDarkMode: isDark });
          }
        } catch (error: any) {
          const msg = String(error?.message || '');
          if (msg.toLowerCase().includes('tema') && msg.toLowerCase().includes('column')) {
            set({ isTemaColumnAvailable: false });
            return;
          }
          console.error('Erro ao carregar tema do usuário:', error);
        }
      },
      
      saveUserTheme: async (userId: string, isDark: boolean) => {
        if (!get().isTemaColumnAvailable) return;
        try {
          const { error } = await supabaseClient
            .from('gbp_usuarios')
            .update({ tema: isDark ? 'dark' : 'light' })
            .eq('uid', userId);
          
          if (error) {
            const msg = String((error as any)?.message || '');
            if (msg.toLowerCase().includes('tema') && msg.toLowerCase().includes('column')) {
              set({ isTemaColumnAvailable: false });
              return;
            }
            console.error('Erro ao salvar tema:', error);
          }
        } catch (error: any) {
          const msg = String(error?.message || '');
          if (msg.toLowerCase().includes('tema') && msg.toLowerCase().includes('column')) {
            set({ isTemaColumnAvailable: false });
            return;
          }
          console.error('Erro ao salvar tema:', error);
        }
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);
