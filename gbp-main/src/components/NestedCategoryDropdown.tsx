import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronDown, Search } from 'lucide-react';
import { Category } from '../types/category';

interface NestedCategoryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
  isLoading?: boolean;
  className?: string;
  placeholder?: string;
  error?: string;
}

interface TipoNode {
  uid: string;
  nome: string;
  categorias: Category[];
}

interface GrupoNode {
  uid: string;
  nome: string;
  tipos: TipoNode[];
}

export const NestedCategoryDropdown: React.FC<NestedCategoryDropdownProps> = ({
  value,
  onChange,
  categories = [],
  isLoading = false,
  className = '',
  placeholder = 'Selecione uma categoria',
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  // Direção/altura/posição do dropdown calculadas conforme o espaço disponível na tela
  const [abreParaCima, setAbreParaCima] = useState(false);
  const [maxAltura, setMaxAltura] = useState(300);
  const [posicao, setPosicao] = useState({ left: 0, width: 0, top: 0, bottom: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Ref da lista renderizada via portal (fica fora do dropdownRef)
  const listRef = useRef<HTMLDivElement>(null);

  // Busca ignora acentos e caixa
  const normalizar = (s: string) =>
    (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Ao buscar, a árvore mostra apenas as categorias que batem com o texto
  const categoriasVisiveis = useMemo(
    () => (busca ? categories.filter(c => normalizar(c.nome).includes(normalizar(busca))) : categories),
    [categories, busca]
  );

  // Estrutura hierárquica: Grupo > Tipo > Categoria
  // Tipos sem grupo (ou categorias sem tipo) ficam no nível raiz (comportamento original)
  const { grupos, tiposSemGrupo } = useMemo(() => {
    const gruposMap = new Map<string, { nome: string; tipos: Map<string, TipoNode> }>();
    const semGrupoMap = new Map<string, TipoNode>();

    categoriasVisiveis.forEach((category) => {
      const tipo = category.tipo;
      const tipoUid = tipo?.uid || 'sem-tipo';
      const tipoNome = tipo?.nome || 'Outros';
      const grupoUid = tipo?.grupo_uid;
      const grupoNome = tipo?.grupo?.nome;

      if (grupoUid && grupoNome) {
        let grupo = gruposMap.get(grupoUid);
        if (!grupo) {
          grupo = { nome: grupoNome, tipos: new Map() };
          gruposMap.set(grupoUid, grupo);
        }
        let tipoNode = grupo.tipos.get(tipoUid);
        if (!tipoNode) {
          tipoNode = { uid: tipoUid, nome: tipoNome, categorias: [] };
          grupo.tipos.set(tipoUid, tipoNode);
        }
        tipoNode.categorias.push(category);
      } else {
        let tipoNode = semGrupoMap.get(tipoUid);
        if (!tipoNode) {
          tipoNode = { uid: tipoUid, nome: tipoNome, categorias: [] };
          semGrupoMap.set(tipoUid, tipoNode);
        }
        tipoNode.categorias.push(category);
      }
    });

    const grupos: GrupoNode[] = Array.from(gruposMap.entries())
      .map(([uid, g]) => ({
        uid,
        nome: g.nome,
        tipos: Array.from(g.tipos.values()).sort((a, b) => a.nome.localeCompare(b.nome))
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));

    const tiposSemGrupo: TipoNode[] = Array.from(semGrupoMap.values())
      .sort((a, b) => a.nome.localeCompare(b.nome));

    return { grupos, tiposSemGrupo };
  }, [categoriasVisiveis]);

  // Elemento que rola a página (container de scroll mais próximo ou a janela)
  const getPageScroller = (): HTMLElement | Window => {
    let node = dropdownRef.current?.parentElement || null;
    while (node) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
        return node;
      }
      node = node.parentElement;
    }
    return window;
  };

  // Recalcula a melhor direção e altura do dropdown conforme o espaço visível
  const ajustarPosicao = () => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const scroller = getPageScroller();
    // Limites visíveis: menor entre a borda do container de scroll e a janela
    const limiteInferior = scroller === window
      ? window.innerHeight
      : Math.min((scroller as HTMLElement).getBoundingClientRect().bottom, window.innerHeight);
    const limiteSuperior = scroller === window
      ? 0
      : Math.max((scroller as HTMLElement).getBoundingClientRect().top, 0);
    const espacoAbaixo = limiteInferior - rect.bottom - 12;
    const espacoAcima = rect.top - limiteSuperior - 12;
    // Abre para o lado com mais espaço; altura máxima de 440px para listar mais itens
    const paraCima = espacoAcima > espacoAbaixo;
    setAbreParaCima(paraCima);
    setMaxAltura(Math.max(160, Math.min(440, paraCima ? espacoAcima : espacoAbaixo)));
    // Posição fixa na tela (o dropdown é renderizado via portal no body).
    // Largura mínima de 360px: em campos estreitos o conteúdo fica legível;
    // o left é deslocado para não estourar a borda direita da tela.
    const largura = Math.min(Math.max(rect.width, 360), window.innerWidth - 16);
    const esquerda = Math.max(8, Math.min(rect.left, window.innerWidth - largura - 8));
    setPosicao({
      left: esquerda,
      width: largura,
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4
    });
  };

  // Mouse sobre o backdrop (fora da lista): repassa o scroll para a página
  const handleBackdropWheel = (e: React.WheelEvent) => {
    const scroller = getPageScroller();
    if (scroller === window) {
      window.scrollBy(0, e.deltaY);
    } else {
      (scroller as HTMLElement).scrollTop += e.deltaY;
    }
  };

  // Reajusta se a página rolar ou a janela mudar de tamanho com o dropdown aberto
  useEffect(() => {
    if (!isOpen) return;
    ajustarPosicao();
    window.addEventListener('scroll', ajustarPosicao, true);
    window.addEventListener('resize', ajustarPosicao);
    return () => {
      window.removeEventListener('scroll', ajustarPosicao, true);
      window.removeEventListener('resize', ajustarPosicao);
    };
  }, [isOpen]);

  // Limpa a busca ao fechar
  useEffect(() => {
    if (!isOpen) setBusca('');
  }, [isOpen]);

  // Encontra o nome da categoria selecionada
  const selectedCategory = categories.find(cat => cat.uid === value);

  // Fecha o dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const dentroDoCampo = dropdownRef.current?.contains(target);
      const dentroDaLista = listRef.current?.contains(target);
      if (!dentroDoCampo && !dentroDaLista) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Ao expandir um grupo, expande também seus tipos;
  // ao recolher, fecha o grupo e seus tipos juntos.
  const toggleGrupo = (grupo: GrupoNode) => {
    const grupoKey = `grupo:${grupo.uid}`;
    const tiposKeys = grupo.tipos.map(t => `grupo:${grupo.uid}/tipo:${t.uid}`);

    setOpenCategories(prev => {
      if (prev.includes(grupoKey)) {
        const keysToRemove = new Set([grupoKey, ...tiposKeys]);
        return prev.filter(id => !keysToRemove.has(id));
      }
      return [...prev, grupoKey, ...tiposKeys];
    });
  };

  const handleSelect = (category: Category) => {
    onChange(category.uid);
    setIsOpen(false);
  };

  const renderCategoriaItem = (category: Category, indentClass: string) => (
    <div
      key={category.uid}
      className={`${indentClass} pr-4 py-2 cursor-pointer border-l-2 ${
        value === category.uid 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 font-medium' 
          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
      onClick={() => handleSelect(category)}
    >
      <span className={`text-gray-700 dark:text-gray-300 truncate block ${value === category.uid ? 'text-blue-600 dark:text-blue-400' : ''}`}>
        {category.nome}
      </span>
    </div>
  );

  const renderTipoHeader = (nome: string, count: number, isOpenTipo: boolean, onToggle: () => void, indentClass: string) => (
    <div
      className={`flex items-center justify-between ${indentClass} pr-4 py-3 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-700/80 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600`}
      onClick={onToggle}
    >
      <div className="flex items-center space-x-2 min-w-0">
        {isOpenTipo ? (
          <ChevronDown className="h-4 w-4 text-blue-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-blue-500 flex-shrink-0" />
        )}
        <span className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wide truncate">{nome}</span>
      </div>
      <span className="ml-2 flex-shrink-0 min-w-[24px] px-2 py-0.5 text-[10px] font-semibold text-center bg-gray-200/80 dark:bg-gray-600 text-gray-600 dark:text-gray-200 rounded-full">
        {count}
      </span>
    </div>
  );

  const renderDropdown = () => {
    if (!isOpen) return null;

    // Portal no <body>: escapa do overflow/clip de qualquer ancestral
    return createPortal(
      <>
        {/* Backdrop para evitar interações com elementos abaixo */}
        <div 
          className="fixed inset-0 bg-transparent"
          style={{ zIndex: 40 }}
          onClick={() => setIsOpen(false)}
          onWheel={handleBackdropWheel}
        />
        
        {/* Dropdown */}
        <div
          ref={listRef}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg overflow-y-auto"
          style={{
            position: 'fixed',
            left: posicao.left,
            width: posicao.width,
            top: abreParaCima ? 'auto' : posicao.top,
            bottom: abreParaCima ? posicao.bottom : 'auto',
            maxHeight: `${maxAltura}px`,
            zIndex: 9999
          }}
        >
          {/* Busca interna — fica fixa no topo enquanto a lista rola */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Buscar categoria..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {busca && grupos.length === 0 && tiposSemGrupo.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
              Nenhuma categoria encontrada para "{busca}"
            </div>
          )}
          {/* Grupos: Grupo > Tipo > Categoria (só existem se a empresa tiver tipos agrupados) */}
          {grupos.map((grupo) => {
            const grupoKey = `grupo:${grupo.uid}`;
            // Com busca ativa, expande tudo para mostrar os resultados
            const grupoAberto = busca ? true : openCategories.includes(grupoKey);

            return (
              <div key={grupoKey} className="border-b border-gray-200 dark:border-gray-600 last:border-0">
                {/* Header do Grupo */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-600/80 bg-gray-200/70 dark:bg-gray-600 border-b border-gray-200 dark:border-gray-600"
                  onClick={() => toggleGrupo(grupo)}
                >
                  <div className="flex items-center space-x-2">
                    {grupoAberto ? (
                      <ChevronDown className="h-4 w-4 text-blue-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-blue-500" />
                    )}
                    <span className="font-extrabold text-gray-900 dark:text-white text-sm uppercase tracking-wider truncate">
                      {grupo.nome}
                    </span>
                  </div>
                  <span className="ml-2 flex-shrink-0 min-w-[24px] px-2 py-0.5 text-[10px] font-semibold text-center bg-gray-200/80 dark:bg-gray-600 text-gray-600 dark:text-gray-200 rounded-full">
                    {grupo.tipos.length}
                  </span>
                </div>

                {/* Tipos dentro do grupo */}
                {grupoAberto && grupo.tipos.map((tipo) => {
                  const tipoKey = `grupo:${grupo.uid}/tipo:${tipo.uid}`;
                  const tipoAberto = busca ? true : openCategories.includes(tipoKey);

                  return (
                    <div key={tipoKey}>
                      {renderTipoHeader(tipo.nome, tipo.categorias.length, tipoAberto, () => toggleCategory(tipoKey), 'pl-8')}
                      {tipoAberto && (
                        <div className="bg-white dark:bg-gray-800 py-1">
                          {tipo.categorias.map((category) => renderCategoriaItem(category, 'pl-14'))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Tipos sem grupo (comportamento original: Tipo > Categoria) */}
          {tiposSemGrupo.map((tipo) => {
            const tipoKey = `tipo:${tipo.uid}`;
            const tipoAberto = busca ? true : openCategories.includes(tipoKey);

            return (
              <div key={tipoKey} className="border-b border-gray-200 dark:border-gray-600 last:border-0">
                {renderTipoHeader(tipo.nome, tipo.categorias.length, tipoAberto, () => toggleCategory(tipoKey), 'pl-4')}
                {tipoAberto && (
                  <div className="bg-white dark:bg-gray-800 py-1">
                    {tipo.categorias.map((category) => renderCategoriaItem(category, 'pl-10'))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>,
      document.body
    );
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: 'var(--button-bg, white)' }}
        className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-left focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 [--button-bg:white] dark:[--button-bg:rgb(31_41_55)] ${className}`}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
            <span>Carregando...</span>
          </div>
        ) : (
          <span className={`truncate block ${selectedCategory ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
            {selectedCategory ? selectedCategory.nome : placeholder}
          </span>
        )}
      </button>

      {error && <span className="text-red-500 text-sm">{error}</span>}

      {renderDropdown()}
    </div>
  );
};
