import { useState, useEffect } from 'react';
import { useCompany } from '../../hooks/useCompany';
import { supabaseClient } from '../../lib/supabase';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function TiposDemanda() {
  const { company } = useCompany();
  const [tipos, setTipos] = useState<string[]>([]);
  const [novoTipo, setNovoTipo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTipos();
  }, [company?.uid]);

  async function loadTipos() {
    if (!company?.uid) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('gbp_demanda_tipo')
        .select('*')
        .eq('empresa_uid', company.uid);

      if (error) {
        console.error('Erro ao carregar tipos:', error);
        toast.error('Erro ao carregar tipos de demanda');
        return;
      }

      // Processa os tipos de demanda de todos os registros encontrados
      const todosOsTipos = new Set<string>();
      
      if (data && data.length > 0) {
        data.forEach(record => {
          if (record.nome_tipo && Array.isArray(record.nome_tipo)) {
            record.nome_tipo.forEach((item: string) => {
              if (item) {
                const [categoria, ...resto] = item.split('::');
                if (categoria && resto.length > 0) {
                  todosOsTipos.add(resto.join('::'));
                } else if (categoria) {
                  todosOsTipos.add(categoria);
                }
              }
            });
          }
        });
      }

      setTipos(Array.from(todosOsTipos).sort());
    } catch (error) {
      console.error('Erro ao processar tipos de demanda:', error);
      toast.error('Erro ao processar tipos de demanda');
      setTipos([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveTipos(newTipos: string[]) {
    if (!company?.uid) return;

    setIsSaving(true);
    const { error } = await supabaseClient
      .from('gbp_demanda_tipo')
      .upsert({
        empresa_uid: company.uid,
        nome_tipo: newTipos
      });

    setIsSaving(false);

    if (error) {
      console.error('Erro ao salvar tipos:', error);
      toast.error('Erro ao salvar tipos de demanda');
      return;
    }

    toast.success('Tipos de demanda atualizados com sucesso');
    setTipos(newTipos);
  }

  function handleAddTipo() {
    if (!novoTipo.trim()) return;
    
    const newTipos = [...tipos, novoTipo.trim()];
    saveTipos(newTipos);
    setNovoTipo('');
  }

  function handleRemoveTipo(index: number) {
    const newTipos = tipos.filter((_, i) => i !== index);
    saveTipos(newTipos);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Tipos de Demanda
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Gerencie os tipos de demanda disponíveis para sua empresa
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {/* Adicionar novo tipo */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={novoTipo}
            onChange={(e) => setNovoTipo(e.target.value)}
            placeholder="Digite um novo tipo de demanda"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            onKeyPress={(e) => e.key === 'Enter' && handleAddTipo()}
          />
          <button
            onClick={handleAddTipo}
            disabled={isSaving || !novoTipo.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Adicionar
          </button>
        </div>

        {/* Lista de tipos */}
        <div className="space-y-2">
          {tipos.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              Nenhum tipo de demanda cadastrado
            </p>
          ) : (
            tipos.map((tipo, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
              >
                <span className="text-gray-900 dark:text-white">{tipo}</span>
                <button
                  onClick={() => handleRemoveTipo(index)}
                  disabled={isSaving}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
