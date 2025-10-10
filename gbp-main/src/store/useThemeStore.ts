import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabaseClient } from '../lib/supabase';

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  loadUserTheme: (userId: string) => Promise<void>;
  saveUserTheme: (userId: string, isDark: boolean) => Promise<void>;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDarkMode: false,
      
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
        try {
          const { data, error } = await supabaseClient
            .from('gbp_usuarios')
            .select('tema')
            .eq('uid', userId)
            .single();
          
          if (!error && data) {
            const isDark = data.tema === 'dark';
            set({ isDarkMode: isDark });
          }
        } catch (error) {
          console.error('Erro ao carregar tema do usuário:', error);
        }
      },
      
      saveUserTheme: async (userId: string, isDark: boolean) => {
        try {
          const { error } = await supabaseClient
            .from('gbp_usuarios')
            .update({ tema: isDark ? 'dark' : 'light' })
            .eq('uid', userId);
          
          if (error) {
            console.error('Erro ao salvar tema:', error);
          }
        } catch (error) {
          console.error('Erro ao salvar tema:', error);
        }
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);
