import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  useEleitoresMenu,
  useAtendimentosMenu,
  useDocumentosMenu,
  useConfiguracoesMenu,
  eleitoresMenuData,
  atendimentosMenuData,
  documentosMenuData,
  configuracoesMenuData,
} from '../store/menuStores';
import { MenuState } from '../types/menu';

type MenuType = 'eleitores' | 'atendimentos' | 'documentos' | 'configuracoes';

export function useMenu(type: MenuType): MenuState {
  const location = useLocation();
  
  // Seleciona o store correto baseado no tipo
  const menuStore = {
    eleitores: useEleitoresMenu,
    atendimentos: useAtendimentosMenu,
    documentos: useDocumentosMenu,
    configuracoes: useConfiguracoesMenu,
  }[type];

  // Seleciona os dados iniciais corretos baseado no tipo
  const initialData = {
    eleitores: eleitoresMenuData,
    atendimentos: atendimentosMenuData,
    documentos: documentosMenuData,
    configuracoes: configuracoesMenuData,
  }[type];

  // Inicializa os dados do menu se necessário
  useEffect(() => {
    const state = menuStore.getState();
    if (!state.sections.length) {
      state.setSections(initialData);
    }
  }, []);

  // Atualiza o item ativo baseado na rota atual
  useEffect(() => {
    const state = menuStore.getState();
    const currentPath = location.pathname;

    // Procura o item correspondente à rota atual
    let foundItemId: string | null = null;
    state.sections.forEach(section => {
      section.items.forEach(item => {
        if (item.path === currentPath) {
          foundItemId = item.id;
        }
        item.children?.forEach(child => {
          if (child.path === currentPath) {
            foundItemId = child.id;
          }
        });
      });
    });

    // Atualiza o item ativo se encontrado
    if (foundItemId) {
      state.setActiveItem(foundItemId);
      state.addRecentPath(currentPath);
    }
  }, [location.pathname]);

  return menuStore();
}
