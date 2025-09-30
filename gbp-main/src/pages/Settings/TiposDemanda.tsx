import { useState, useEffect } from 'react';
import { useCompanyStore } from "../../store/useCompanyStore";
import { supabaseClient } from "../../lib/supabase";
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface Categoria {
  categoria: string;
  itens: string[];
}

interface TagInputProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (index: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

const TagInput: React.FC<TagInputProps> = ({ tags, onAddTag, onRemoveTag, placeholder, disabled }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      onAddTag(inputValue.trim());
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onRemoveTag(tags.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 p-3 border border-gray-100 rounded-lg bg-gray-50">
      {tags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 group hover:bg-blue-100 transition-colors"
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemoveTag(index)}
            disabled={disabled}
            className="ml-2 inline-flex items-center justify-center text-blue-500 hover:text-blue-700 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 min-w-[200px] px-2 py-1 bg-transparent placeholder-gray-400 focus:outline-none text-sm"
      />
    </div>
  );
};

export default function TiposDemanda() {
  const company = useCompanyStore((state) => state.company);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [showMobileInput, setShowMobileInput] = useState(false);

  useEffect(() => {
    loadCategorias();
  }, [company?.uid]);

  async function loadCategorias() {
    if (!company?.uid) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabaseClient
      .from('gbp_demanda_tipo')
      .select('*')
      .eq('empresa_uid', company.uid);

    if (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar tipos de demanda');
      return;
    }

    if (data && data.length > 0) {
      try {
        const categoriasMap = new Map<string, string[]>();
        // Usamos o primeiro registro encontrado para a empresa
        const tipos = data[0].nome_tipo || [];
        
        tipos.forEach((item: string) => {
          if (!item) return;
          const [categoria, ...resto] = item.split('::');
          if (!categoriasMap.has(categoria)) {
            categoriasMap.set(categoria, []);
          }
          if (resto.length > 0) {
            categoriasMap.get(categoria)?.push(resto.join('::'));
          }
        });

        const categoriasArray: Categoria[] = Array.from(categoriasMap).map(([categoria, itens]) => ({
          categoria,
          itens
        }));

        setCategorias(categoriasArray);
        setExpandedCategories(categoriasArray.map(c => c.categoria));
      } catch (e) {
        console.error('Erro ao processar dados:', e);
        setCategorias([]);
      }
    }
    setIsLoading(false);
  }

  async function saveCategorias(newCategorias: Categoria[]) {
    if (!company?.uid) return;

    setIsSaving(true);

    try {
      // Prepara o array de tipos no formato correto
      const tiposArray = newCategorias.flatMap(cat => 
        [cat.categoria, ...cat.itens.map(item => `${cat.categoria}::${item}`)]
      );

      // Primeiro verifica se já existe um registro para esta empresa
      const { data: existingData, error: fetchError } = await supabaseClient
        .from('gbp_demanda_tipo')
        .select('uid')
        .eq('empresa_uid', company.uid);

      if (fetchError) throw fetchError;

      if (existingData && existingData.length > 0) {
        // Se existe, atualiza o registro existente
        const { error: updateError } = await supabaseClient
          .from('gbp_demanda_tipo')
          .update({ 
            nome_tipo: tiposArray,
            updated_at: new Date().toISOString()
          })
          .eq('uid', existingData[0].uid);
        
        if (updateError) throw updateError;
      } else {
        // Se não existe, cria um novo registro
        const { error: insertError } = await supabaseClient
          .from('gbp_demanda_tipo')
          .insert([{
            empresa_uid: company.uid,
            nome_tipo: tiposArray
          }]);
        
        if (insertError) throw insertError;
      }

      toast.success('Tipos de demanda atualizados com sucesso');
      setCategorias(newCategorias);
    } catch (error) {
      console.error('Erro ao salvar categorias:', error);
      toast.error('Erro ao salvar tipos de demanda');
    } finally {
      setIsSaving(false);
    }
  }

  function handleAddCategoria() {
    if (!novaCategoria.trim()) return;
    
    const newCategorias = [...categorias, { categoria: novaCategoria.trim(), itens: [] }];
    saveCategorias(newCategorias);
    setNovaCategoria('');
    setExpandedCategories([...expandedCategories, novaCategoria.trim()]);
  }

  function handleAddItem(categoria: string, novoItem: string) {
    const newCategorias = categorias.map(cat => {
      if (cat.categoria === categoria) {
        return {
          ...cat,
          itens: [...cat.itens, novoItem]
        };
      }
      return cat;
    });
    
    saveCategorias(newCategorias);
  }

  function handleRemoveCategoria(categoria: string) {
    const newCategorias = categorias.filter(cat => cat.categoria !== categoria);
    saveCategorias(newCategorias);
    setExpandedCategories(expandedCategories.filter(c => c !== categoria));
  }

  function handleRemoveItem(categoria: string, itemIndex: number) {
    const newCategorias = categorias.map(cat => {
      if (cat.categoria === categoria) {
        return {
          ...cat,
          itens: cat.itens.filter((_, i) => i !== itemIndex)
        };
      }
      return cat;
    });
    saveCategorias(newCategorias);
  }

  function toggleCategoria(categoria: string) {
    setExpandedCategories(prev => 
      prev.includes(categoria)
        ? prev.filter(c => c !== categoria)
        : [...prev, categoria]
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-500 dark:text-gray-400">
          Carregando empresa...
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-13rem)] relative">
      <div className="flex flex-col gap-6 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Tipos de Demanda</h2>
          <p className="text-sm text-gray-500">Organize suas demandas em categorias e subcategorias para melhor gerenciamento.</p>
        </div>

        <div className="w-full bg-white rounded-lg shadow-sm border border-gray-100 hover:border-primary-500 transition-colors md:block hidden">
          <div className="relative flex items-center">
            <input
              type="text"
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategoria()}
              placeholder="Digite o nome da categoria (ex: Infraestrutura, Saúde, Educação)"
              className="w-full px-4 py-3 rounded-lg focus:outline-none"
              disabled={isLoading || isSaving}
            />
            <button
              onClick={handleAddCategoria}
              disabled={!novaCategoria.trim() || isLoading || isSaving}
              className="absolute right-2 px-3 py-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Adicionar</span>
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <p className="mt-4 text-gray-500">Carregando categorias...</p>
        </div>
      ) : categorias.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <div className="bg-white p-3 rounded-full shadow-sm mb-4">
            <PlusIcon className="h-6 w-6 text-primary-500" />
          </div>
          <p className="text-gray-600 text-center mb-2">Nenhuma categoria cadastrada</p>
          <p className="text-sm text-gray-500 text-center">
            Comece adicionando uma categoria acima para organizar seus tipos de demanda
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {categorias.map((cat) => (
            <div
              key={cat.categoria}
              className="bg-white rounded-lg shadow-sm border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                   onClick={() => toggleCategoria(cat.categoria)}>
                <h3 className="text-lg font-medium text-gray-900">{cat.categoria}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCategoria(cat.categoria);
                    }}
                    className="p-1 hover:bg-red-100 rounded-full transition-colors"
                  >
                    <TrashIcon className="h-5 w-5 text-red-500" />
                  </button>
                  {expandedCategories.includes(cat.categoria) ? (
                    <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </div>
              
              {expandedCategories.includes(cat.categoria) && (
                <div className="p-4 border-t border-gray-100">
                  <TagInput
                    tags={cat.itens}
                    onAddTag={(tag) => handleAddItem(cat.categoria, tag)}
                    onRemoveTag={(index) => handleRemoveItem(cat.categoria, index)}
                    placeholder="Digite um novo item e pressione Enter"
                    disabled={isSaving}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Botão flutuante para mobile */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <div className="relative">
          <div className={`absolute bottom-16 right-0 transform transition-all duration-200 ${
            showMobileInput ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}>
            <div className="bg-white rounded-lg shadow-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Categoria
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategoria()}
                  placeholder="Ex: Infraestrutura, Saúde"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={isLoading || isSaving}
                />
                <button
                  onClick={() => {
                    if (novaCategoria.trim()) {
                      handleAddCategoria();
                      setShowMobileInput(false);
                    }
                  }}
                  disabled={!novaCategoria.trim() || isLoading || isSaving}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowMobileInput(!showMobileInput)}
            className="h-14 w-14 rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center transition-all relative"
          >
            <PlusIcon className={`h-6 w-6 transition-transform duration-200 ${showMobileInput ? 'rotate-45' : ''}`} />
            {!showMobileInput && (
              <span className="absolute -top-10 right-0 whitespace-nowrap bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                Adicionar Categoria
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
