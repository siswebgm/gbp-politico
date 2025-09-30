import { useState } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { supabaseClient } from '../../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { toTitleCase } from '../../../utils/formatText';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useToast } from "../../../components/ui/use-toast";

interface NovoIndicadoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NovoIndicadoModal({ isOpen, onClose }: NovoIndicadoModalProps) {
  const { user } = useAuth();
  const { company } = useCompanyStore();
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [bairro, setBairro] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      setError('Nome é obrigatório');
      toast({
        title: "⚠️ Campo obrigatório",
        description: "O nome do indicado é obrigatório",
        className: "bg-yellow-50 border-yellow-200 text-yellow-800",
        duration: 3000,
      });
      return;
    }

    if (!company?.uid) {
      setError('Empresa não encontrada');
      toast({
        title: "❌ Erro",
        description: "Empresa não encontrada",
        className: "bg-red-50 border-red-200 text-red-800",
        duration: 3000,
      });
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      toast({
        title: "🔄 Processando...",
        description: "Criando novo indicado",
        className: "bg-blue-50 border-blue-200 text-blue-800",
        duration: 2000,
      });

      const { data, error: insertError } = await supabaseClient
        .from('gbp_indicado')
        .insert([
          {
            nome: nome.trim(),
            cidade: cidade.trim() || null,
            bairro: bairro.trim() || null,
            empresa_uid: company.uid
          }
        ])
        .select()
        .single();

      if (insertError) {
        setError('Erro ao criar indicado');
        console.error('Erro ao criar indicado:', insertError);
        
        if (insertError.code === '23505') {
          toast({
            title: "❌ Indicado duplicado",
            description: "Já existe um indicado com este nome",
            className: "bg-red-50 border-red-200 text-red-800",
            duration: 3000,
          });
        } else {
          toast({
            title: "❌ Erro",
            description: "Erro ao criar indicado",
            className: "bg-red-50 border-red-200 text-red-800",
            duration: 3000,
          });
        }
        return;
      }

      // Atualiza a lista de indicados no cache
      await queryClient.invalidateQueries({ queryKey: ['indicadores'] });
      
      toast({
        title: "✅ Sucesso!",
        description: "Indicado criado com sucesso",
        className: "bg-green-50 border-green-200 text-green-800",
        duration: 3000,
      });

      setNome('');
      setCidade('');
      setBairro('');
      onClose();
    } catch (error) {
      console.error('Erro ao criar indicado:', error);
      setError('Erro ao criar indicado');
      toast({
        title: "❌ Erro inesperado",
        description: "Não foi possível criar o indicado",
        className: "bg-red-50 border-red-200 text-red-800",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30"></div>
        
        <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6">
          <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
            Novo Indicado
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(toTitleCase(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Digite o nome do indicado"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(toTitleCase(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Digite a cidade"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(toTitleCase(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Digite o bairro"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Salvando...
                    </span>
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
