```ts
import { useThemeStore } from '../store/useThemeStore';

export function useTheme() {
  const { isDarkMode, toggleTheme } = useThemeStore();
  return { isDarkMode, toggleTheme };
}
```