export interface MenuItem {
  id: string;
  label: string;
  path?: string;
  icon?: string;
  badge?: number;
  children?: MenuItem[];
  isExpanded?: boolean;
}

export interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

export interface MenuState {
  isOpen: boolean;
  activeItemId: string | null;
  expandedItems: string[];
  sections: MenuSection[];
  recentPaths: string[];
  toggleMenu: () => void;
  setActiveItem: (itemId: string) => void;
  toggleExpandedItem: (itemId: string) => void;
  addRecentPath: (path: string) => void;
  setSections: (sections: MenuSection[]) => void;
}
