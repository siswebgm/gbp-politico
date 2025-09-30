import { Settings, Users, Calendar } from 'lucide-react';
import { CategorySettings } from '../../Settings/components/CategorySettings';

export function Configuracoes() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Configurações
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Gerencie categorias, indicados e configurações de aniversário
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center gap-3">
          <Settings className="w-6 h-6 text-primary-500" />
          <span className="text-gray-900 dark:text-white font-medium">Categorias</span>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center gap-3">
          <Users className="w-6 h-6 text-primary-500" />
          <span className="text-gray-900 dark:text-white font-medium">Indicados</span>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center gap-3">
          <Calendar className="w-6 h-6 text-primary-500" />
          <span className="text-gray-900 dark:text-white font-medium">Aniversário</span>
        </div>
      </div>

      <div className="space-y-8">
        <CategorySettings />
      </div>
    </div>
  );
}
