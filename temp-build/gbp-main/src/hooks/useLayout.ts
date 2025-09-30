```ts
import { useLayoutStore } from '../store/useLayoutStore';

export function useLayout() {
  const { isSidebarOpen, toggleSidebar, closeSidebar } = useLayoutStore();
  return { isSidebarOpen, toggleSidebar, closeSidebar };
}
```