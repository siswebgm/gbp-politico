import { useState, useEffect } from 'react';
import { Check, Shield, Users, BarChart, User, UserCheck, ChevronRight } from 'lucide-react';
import { ACCESS_LEVEL_DESCRIPTIONS } from '../constants/accessLevels';

interface AccessLevelPermissionsProps {
  selectedLevel: string;
  onLevelChange: (level: string) => void;
}

const LEVEL_NAMES: Record<string, string> = {
  admin: 'Administrador',
  coordenador: 'Coordenador',
  analista: 'Analista',
  colaborador: 'Colaborador',
  visitante: 'Visitante'
};

const LEVEL_ICONS: Record<string, JSX.Element> = {
  admin: <Shield className="w-6 h-6" />,
  coordenador: <Users className="w-6 h-6" />,
  analista: <BarChart className="w-6 h-6" />,
  colaborador: <UserCheck className="w-6 h-6" />,
  visitante: <User className="w-6 h-6" />
};

export function AccessLevelPermissions({ selectedLevel, onLevelChange }: AccessLevelPermissionsProps) {
  const [selectedTab, setSelectedTab] = useState(selectedLevel);

  // Atualiza a aba quando o nível selecionado mudar externamente
  useEffect(() => {
    setSelectedTab(selectedLevel);
  }, [selectedLevel]);

  const handleLevelSelect = (level: string) => {
    setSelectedTab(level);
    onLevelChange(level);
  };

  // Funções auxiliares para estilização
  const getBorderColor = (level: string) => {
    const colors = {
      'admin': 'border-blue-500',
      'coordenador': 'border-purple-500',
      'analista': 'border-emerald-500',
      'colaborador': 'border-amber-500',
      'visitante': 'border-gray-300'
    };
    return colors[level as keyof typeof colors] || 'border-gray-200';
  };

  const getBgColor = (level: string) => {
    const colors = {
      'admin': 'bg-blue-100 text-blue-600',
      'coordenador': 'bg-purple-100 text-purple-600',
      'analista': 'bg-emerald-100 text-emerald-600',
      'colaborador': 'bg-amber-100 text-amber-600',
      'visitante': 'bg-gray-100 text-gray-600'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100';
  };

  const selectedName = LEVEL_NAMES[selectedTab as keyof typeof LEVEL_NAMES] || '';
  const selectedIcon = LEVEL_ICONS[selectedTab as keyof typeof LEVEL_ICONS];
  const selectedDescriptions = ACCESS_LEVEL_DESCRIPTIONS[selectedTab as keyof typeof ACCESS_LEVEL_DESCRIPTIONS] || [];

  return (
    <div className="w-full flex flex-col bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Nível de Acesso: {selectedName}</h2>
          <p className="text-gray-600">Permissões e funcionalidades disponíveis</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className={`p-6 border-b-4 ${getBorderColor(selectedTab)} bg-gray-50`}>
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${getBgColor(selectedTab)}`}>
                {selectedIcon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedName}</h3>
                <p className="text-gray-600">Nível de acesso selecionado</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Permissões Incluídas:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedDescriptions.map((permission, i) => (
                <div key={i} className="flex items-start p-3 bg-gray-50 rounded-lg">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">{permission}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
