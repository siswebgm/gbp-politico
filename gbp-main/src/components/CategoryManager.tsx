import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ChevronRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  subcategories: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
}

interface CategoryManagerProps {
  onSelect: (category: string, subcategory?: string) => void;
}

export function CategoryManager({ onSelect }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([
    {
      id: '1',
      name: 'Apoiador',
      subcategories: [
        { id: '1-1', name: 'Ativo' },
        { id: '1-2', name: 'Ocasional' },
      ],
    },
    {
      id: '2',
      name: 'Líder',
      subcategories: [
        { id: '2-1', name: 'Comunitário' },
        { id: '2-2', name: 'Regional' },
      ],
    },
  ]);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSubcategory, setShowAddSubcategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory: Category = {
        id: Date.now().toString(),
        name: newCategoryName.trim(),
        subcategories: [],
      };
      setCategories([...categories, newCategory]);
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const handleAddSubcategory = (categoryId: string) => {
    if (newSubcategoryName.trim()) {
      setCategories(categories.map(category => {
        if (category.id === categoryId) {
          return {
            ...category,
            subcategories: [
              ...category.subcategories,
              {
                id: `${categoryId}-${Date.now()}`,
                name: newSubcategoryName.trim(),
              },
            ],
          };
        }
        return category;
      }));
      setNewSubcategoryName('');
      setShowAddSubcategory(null);
    }
  };

  const handleSelect = (categoryId: string, subcategoryId?: string) => {
    const category = categories.find(c => c.id === categoryId);
    const subcategory = subcategoryId 
      ? category?.subcategories.find(s => s.id === subcategoryId)
      : undefined;

    setSelectedCategory(categoryId);
    setSelectedSubcategory(subcategoryId || '');
    onSelect(category?.name || '', subcategory?.name);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Categorias</h3>
        <button
          onClick={() => setShowAddCategory(true)}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nova Categoria
        </button>
      </div>

      {showAddCategory && (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="block w-full h-10 px-3 rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            placeholder="Nome da categoria"
          />
          <button
            onClick={handleAddCategory}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Adicionar
          </button>
          <button
            onClick={() => setShowAddCategory(false)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Cancelar
          </button>
        </div>
      )}

      <div className="space-y-2">
        {categories.map((category) => (
          <div key={category.id} className="space-y-2">
            <div
              className={`flex items-center justify-between p-3 rounded-md cursor-pointer ${
                selectedCategory === category.id
                  ? 'bg-primary-50 dark:bg-primary-900'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => handleSelect(category.id)}
            >
              <div className="flex items-center">
                <ChevronRight className="h-4 w-4 mr-2 text-gray-400" />
                <span className="font-medium">{category.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddSubcategory(category.id);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button className="p-1 text-gray-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {showAddSubcategory === category.id && (
              <div className="ml-6 flex items-center space-x-2">
                <input
                  type="text"
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  className="block w-full h-10 px-3 rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Nome da subcategoria"
                />
                <button
                  onClick={() => handleAddSubcategory(category.id)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Adicionar
                </button>
                <button
                  onClick={() => setShowAddSubcategory(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
              </div>
            )}

            <div className="ml-6 space-y-1">
              {category.subcategories.map((subcategory) => (
                <div
                  key={subcategory.id}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${
                    selectedSubcategory === subcategory.id
                      ? 'bg-primary-50 dark:bg-primary-900'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => handleSelect(category.id, subcategory.id)}
                >
                  <span className="text-sm">{subcategory.name}</span>
                  <div className="flex items-center space-x-2">
                    <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}