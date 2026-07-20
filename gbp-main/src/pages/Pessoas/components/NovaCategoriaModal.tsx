import { useState } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { toTitleCase } from '../../../utils/formatText';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { categoryService } from '../../../services/categories';
import { categoryTypesService } from '../../../services/categoryTypes';
import { useToast } from "../../../components/ui/use-toast";
import { useCategoryTypes } from '../../../hooks/useCategoryTypes';
import { Plus } from 'lucide-react';

interface NovaCategoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NovaCategoriaModal({ isOpen, onClose }: NovaCategoriaModalProps) {
  const { user } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const [nomes, setNomes] = useState<string[]>([]);
  const [novoNome, setNovoNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState('');
  const [novoTipo, setNovoTipo] = useState('');
  const [showNovoTipo, setShowNovoTipo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: tipos, isLoading: isLoadingTipos } = useCategoryTypes();

  const handleAddNome = () => {
    if (!novoNome.trim()) return;
    
    const nomeFormatado = novoNome
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    if (!nomes.includes(nomeFormatado)) {
      setNomes([...nomes, nomeFormatado]);
      setNovoNome('');
    }
  };

  const handleRemoveNome = (index: number) => {
    setNomes(nomes.filter((_, i) => i !== index));
  };

  const handleNovoNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Se contém vírgula, adiciona as categorias
    if (value.includes(',')) {
      const novosNomes = value.split(',').map(nome => nome.trim()).filter(Boolean);
      const nomesFormatados = novosNomes.map(nome => 
        nome.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
      );
      
      // Adiciona apenas nomes que ainda não existem
      const nomesUnicos = nomesFormatados.filter(nome => !nomes.includes(nome));
      if (nomesUnicos.length > 0) {
        setNomes([...nomes, ...nomesUnicos]);
      }
      setNovoNome('');
    } else {
      // Formata o texto enquanto digita
      const formattedValue = value
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      setNovoNome(formattedValue);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (novoNome.trim()) {
        handleAddNome();
      }
    }
  };

  const handleAddNovoTipo = async () => {
    if (!novoTipo.trim()) {
      toast({
        title: "⚠️ Campo obrigatório",
        description: "O nome do tipo é obrigatório",
        className: "bg-yellow-50 border-yellow-200 text-yellow-800",
        duration: 3000,
      });
      return;
    }

    try {
      setIsLoading(true);
      const novoTipoData = await categoryTypesService.create(
        toTitleCase(novoTipo),
        company?.uid || ''
      );
      
      // Atualiza a lista de tipos
      queryClient.invalidateQueries(['categoria-tipos']);
      
      // Seleciona o novo tipo
      setTipo(novoTipoData.uid);
      
      // Limpa o campo e fecha o formulário de novo tipo
      setNovoTipo('');
      setShowNovoTipo(false);
      
      toast({
        title: "✨ Sucesso!",
        description: "Novo tipo de categoria criado!",
        className: "bg-green-50 border-green-200 text-green-800",
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao criar novo tipo",
        className: "bg-red-50 border-red-200 text-red-800",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if ((!tipo || tipo === '') && (!showNovoTipo || !novoTipo.trim())) {
      toast({
        title: "⚠️ Campo obrigatório",
        description: "Selecione um tipo de categoria ou crie um novo",
        className: "bg-yellow-50 border-yellow-200 text-yellow-800",
        duration: 3000,
      });
      return;
    }
    
    if (nomes.length === 0) {
      toast({
        title: "⚠️ Campo obrigatório",
        description: "Adicione pelo menos um nome de categoria",
        className: "bg-yellow-50 border-yellow-200 text-yellow-800",
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);

    try {
      let tipoUid = tipo;

      // Se for um novo tipo, cria primeiro
      if (showNovoTipo && novoTipo.trim()) {
        const novoTipoFormatado = novoTipo.trim().toUpperCase();
        const createdTipo = await categoryTypesService.create({
          nome: novoTipoFormatado,
          empresa_uid: company?.uid || ''
        });
        tipoUid = createdTipo.uid;
      }

      // Cria todas as categorias com o mesmo tipo
      await Promise.all(
        nomes.map(nome => 
          categoryService.create({
            nome: nome,
            tipo_uid: tipoUid,
            empresa_uid: company?.uid || ''
          })
        )
      );

      toast({
        title: "✨ Sucesso!",
        description: `${nomes.length} ${nomes.length === 1 ? 'categoria criada' : 'categorias criadas'} com sucesso!`,
        className: "bg-green-50 border-green-200 text-green-800",
        duration: 3000,
      });

      setNomes([]);
      setNovoNome('');
      setDescricao('');
      setTipo('');
      onClose();
    } catch (error) {
      console.error('Erro ao criar categorias:', error);
      setError(error instanceof Error ? error.message : 'Erro ao criar categorias');
      toast({
        title: "❌ Erro",
        description: error instanceof Error ? error.message : "Erro ao criar categorias",
        className: "bg-red-50 border-red-200 text-red-800",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-100 dark:border-gray-700">
        <div className="relative p-4 sm:p-8">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200"
            aria-label="Fechar modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Nova Categoria
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="space-y-8">
              <div>
                <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                  1. Qual o tipo da categoria? <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {!showNovoTipo ? (
                    <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                      <select
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value)}
                        className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500 transition-colors duration-200"
                        disabled={isLoading || isLoadingTipos}
                      >
                        <option value="">Selecione o tipo (ex: Documentos)</option>
                        {tipos?.map((t) => (
                          <option key={t.uid} value={t.uid}>
                            {t.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                      <input
                        type="text"
                        value={novoTipo}
                        onChange={(e) => setNovoTipo(e.target.value.toUpperCase())}
                        className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500 transition-colors duration-200"
                        placeholder="Digite o nome do novo tipo"
                        disabled={isLoading}
                      />
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={handleAddNovoTipo}
                          className="flex-1 sm:flex-none px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-colors duration-200"
                          disabled={isLoading}
                        >
                          Adicionar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNovoTipo(false);
                            setNovoTipo('');
                          }}
                          className="flex-1 sm:flex-none px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                    ou
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNovoTipo(true)}
                    className="w-full text-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors duration-200"
                  >
                    Criar um novo tipo de categoria
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                  2. Quais categorias você quer adicionar? <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  <div className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-4 text-gray-900 dark:text-gray-100 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 min-h-[120px] transition-colors duration-200">
                    <div className="flex flex-wrap gap-2 items-start">
                      {nomes.map((nome, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          <span>{nome}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveNome(index)}
                            className="hover:text-blue-900 dark:hover:text-blue-100 transition-colors duration-200"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <input
                        type="text"
                        value={novoNome}
                        onChange={handleNovoNomeChange}
                        onKeyPress={handleKeyPress}
                        className="flex-1 min-w-[200px] bg-transparent focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="Digite para adicionar mais..."
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                    Use vírgula ou Enter para adicionar
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                    Cole múltiplas categorias separadas por vírgula
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span>Salvando...</span>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-opacity-20 border-t-white"></div>
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
