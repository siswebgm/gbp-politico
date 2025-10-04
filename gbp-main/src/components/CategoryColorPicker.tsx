import { useState, useEffect } from 'react';
import { Palette, Save, X } from 'lucide-react';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';
import toast from 'react-hot-toast';

interface Category {
  uid: string;
  nome: string;
  cor?: string;
}

export function CategoryColorPicker() {
  const company = useCompanyStore(state => state.company);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Cores predefinidas para seleção rápida
  const presetColors = [
    '#3B82F6', // Azul
    '#EC4899', // Rosa
    '#10B981', // Verde
    '#F59E0B', // Amarelo
    '#EF4444', // Vermelho
    '#8B5CF6', // Roxo
    '#F97316', // Laranja
    '#06B6D4', // Ciano
    '#84CC16', // Lima
    '#6366F1', // Índigo
  ];

  useEffect(() => {
    loadCategories();
  }, [company?.uid]);

  const loadCategories = async () => {
    if (!company?.uid) return;

    try {
      const { data, error } = await supabaseClient
        .from('gbp_categorias')
        .select('uid, nome, cor')
        .eq('empresa_uid', company.uid)
        .order('nome');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const updateCategoryColor = async (categoryUid: string, color: string) => {
    setSaving(categoryUid);

    try {
      const { error } = await supabaseClient
        .from('gbp_categorias')
        .update({ cor: color })
        .eq('uid', categoryUid);

      if (error) throw error;

      setCategories(prev =>
        prev.map(cat =>
          cat.uid === categoryUid ? { ...cat, cor: color } : cat
        )
      );

      toast.success('Cor atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar cor:', error);
      toast.error('Erro ao atualizar cor da categoria');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Palette className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Cores das Categorias no Mapa
        </h2>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Defina cores personalizadas para cada categoria. Essas cores serão usadas para identificar os eleitores no mapa.
      </p>

      {categories.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Nenhuma categoria cadastrada
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <div
              key={category.uid}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0"
                  style={{ backgroundColor: category.cor || '#3B82F6' }}
                />
                <span className="font-medium text-gray-900 dark:text-white">
                  {category.nome}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Seletor de cor nativo */}
                <input
                  type="color"
                  value={category.cor || '#3B82F6'}
                  onChange={(e) => updateCategoryColor(category.uid, e.target.value)}
                  disabled={saving === category.uid}
                  className="w-12 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                  title="Escolher cor personalizada"
                />

                {/* Cores predefinidas */}
                <div className="flex gap-1">
                  {presetColors.slice(0, 5).map((color) => (
                    <button
                      key={color}
                      onClick={() => updateCategoryColor(category.uid, color)}
                      disabled={saving === category.uid}
                      className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform disabled:opacity-50"
                      style={{ backgroundColor: color }}
                      title={`Aplicar cor ${color}`}
                    />
                  ))}
                </div>

                {saving === category.uid && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Dica:</strong> As cores escolhidas aqui serão aplicadas automaticamente aos marcadores dos eleitores no mapa eleitoral, facilitando a identificação visual por categoria.
        </p>
      </div>
    </div>
  );
}
