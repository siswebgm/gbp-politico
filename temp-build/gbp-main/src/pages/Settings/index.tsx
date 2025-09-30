import { useState, useEffect } from 'react';
import { CategorySettings } from './components/CategorySettings';
import { IndicadoSettings } from './components/IndicadoSettings';
import { BirthdaySettings } from './components/BirthdaySettings';
import { Cog, Users, Gift, Upload, FormInput, CreditCard, MessageSquare, ListChecks, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useNavigate } from 'react-router-dom';
import { hasRestrictedAccess } from '../../constants/accessLevels';
import TiposDemanda from './TiposDemanda';

type SettingsTab = 'categories' | 'indicados' | 'birthday' | 'whatsapp' | 'upload' | 'form' | 'planos' | 'tipos-demanda';

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('categories');
  const { isAuthenticated, isLoading, user } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const navigate = useNavigate();

  const canAccess = hasRestrictedAccess(user?.nivel_acesso);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !company || !canAccess)) {
      navigate('/app');
      return;
    }
  }, [isLoading, isAuthenticated, company, canAccess, navigate]);

  useEffect(() => {
    if (activeTab === 'upload') {
      navigate('/app/eleitores/importar');
    } else if (activeTab === 'form') {
      navigate('/app/configuracoes/gerenciar-formulario');
    }
  }, [activeTab, navigate]);

  const handleTabChange = (tab: SettingsTab) => {
    if (tab === 'whatsapp') {
      navigate('/app/whatsapp');
      return;
    }
    if (tab === 'planos') {
      navigate('/app/planos');
      return;
    }
    setActiveTab(tab);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-lg shadow animate-pulse">
            <div className="p-2 sm:p-6">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'categories', label: 'Categorias', icon: Cog },
    { id: 'indicados', label: 'Indicados', icon: Users },
    { id: 'tipos-demanda', label: 'Tipos de Demanda', icon: ListChecks },
    { id: 'birthday', label: 'Aniversário', icon: Gift },
    { id: 'form', label: 'Formulário de Cadastro', icon: FormInput },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'planos', label: 'Planos', icon: CreditCard }
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto">
        {/* Header separado com background branco */}
        <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
          <div className="w-full px-4">
            <div className="py-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/app')}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  title="Voltar"
                >
                  <ChevronLeft className="h-6 w-6" strokeWidth={1} />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Área de Configurações
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Gerencie e personalize o sistema de acordo com suas necessidades
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Container principal */}
        <div className="w-full px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex flex-col">
              <div className="p-4">
                {/* Tabs */}
                <div className="space-y-6">
                  <div className="overflow-x-auto pb-4">
                    <nav className="flex gap-6 min-w-max">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id as SettingsTab)}
                            className={`
                              flex items-center whitespace-nowrap px-1 py-4 border-b-2 text-sm font-medium transition-colors duration-200
                              ${activeTab === tab.id
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                              }
                            `}
                          >
                            <Icon className="h-5 w-5 mr-2" />
                            {tab.label}
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                  <div className="mt-8">
                    {activeTab === 'categories' && <CategorySettings />}
                    {activeTab === 'indicados' && <IndicadoSettings />}
                    {activeTab === 'birthday' && <BirthdaySettings />}
                    {activeTab === 'tipos-demanda' && <TiposDemanda />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}