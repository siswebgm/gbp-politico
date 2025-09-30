import { useState } from 'react';
import { Edit2, Trash2, Plus, X, Check, Loader2 } from 'lucide-react';
import { useCategoriaTipos } from '../../../hooks/useCategoriaTipos';
import { toast } from 'react-toastify';

export function CategoriaTiposTable() {
  const { tipos, isLoading, create, update, delete: deleteTipo } = useCategoriaTipos();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newTipoName, setNewTipoName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleStartEdit = (tipo: { uid: string; nome: string }) => {
    setEditingId(tipo.uid);
    setEditingName(tipo.nome);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleUpdate = async (uid: string) => {
    try {
      await update({ uid, nome: editingName });
      setEditingId(null);
      setEditingName('');
      toast.success('Tipo de categoria atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar tipo de categoria');
    }
  };

  const handleDelete = async (uid: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este tipo de categoria?')) {
      return;
    }

    try {
      await deleteTipo(uid);
      toast.success('Tipo de categoria excluído com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir tipo de categoria');
    }
  };

  const handleCreate = async () => {
    if (!newTipoName.trim()) return;

    try {
      setIsCreating(true);
      await create({ nome: newTipoName });
      setNewTipoName('');
      toast.success('Tipo de categoria criado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar tipo de categoria');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tipos de Categoria</h3>
      </div>

      {/* Formulário para novo tipo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTipoName}
            onChange={(e) => setNewTipoName(e.target.value)}
            placeholder="Nome do novo tipo..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={handleCreate}
            disabled={isCreating || !newTipoName.trim()}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Adicionar
          </button>
        </div>
      </div>

      {/* Lista de tipos */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {tipos.map((tipo) => (
          <div key={tipo.uid} className="p-4 flex items-center justify-between">
            {editingId === tipo.uid ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={() => handleUpdate(tipo.uid)}
                  className="p-2 text-green-600 hover:text-green-700 focus:outline-none"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 text-red-600 hover:text-red-700 focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                <span className="text-gray-900 dark:text-white">{tipo.nome}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartEdit(tipo)}
                    className="p-2 text-blue-600 hover:text-blue-700 focus:outline-none"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(tipo.uid)}
                    className="p-2 text-red-600 hover:text-red-700 focus:outline-none"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
