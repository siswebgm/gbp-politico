import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

export function ThemeToggle() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full hover:bg-primary-400/10 text-primary-100 hover:text-white"
      title={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
      type="button"
    >
      {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}