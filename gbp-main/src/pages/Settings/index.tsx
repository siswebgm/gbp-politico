import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { CategorySettings } from './components/CategorySettings';
import { IndicadoSettings } from './components/IndicadoSettings';
import { BirthdaySettings } from './components/BirthdaySettings';
import { ExtensaoSettings } from './components/ExtensaoSettings';
import { MessageSettings } from './components/MessageSettings';
import { CompanySettings } from './components/CompanySettings';
import { 
  Cog, 
  Users, 
  Gift, 
  Upload, 
  FormInput, 
  CreditCard, 
  MessageSquare, 
  ChevronLeft, 
  Chrome, 
  Send, 
  ExternalLink,
  Building2
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useNavigate } from 'react-router-dom';
import { hasRestrictedAccess } from '../../constants/accessLevels';

type SettingsTab = 'categorias' | 'indicados' | 'aniversario' | 'whatsapp' | 'upload' | 'form' | 'planos' | 'extensao' | 'mensagens' | 'empresa';

// Helper para adicionar scroll horizontal com touch (comprovado no projeto)
const setupHorizontalScroll = (el: HTMLDivElement | null) => {
  if (!el) return;
  
  el.style.cssText = 'overflow-x: scroll; overflow-y: visible; -webkit-overflow-scrolling: touch; width: 100%; position: relative;';
  
  let startX = 0;
  let startY = 0;
  let scrollLeft = 0;
  let isHorizontalScroll = false;
  
  el.addEventListener('touchstart', (e) => {
    startX = e.touches[0].pageX - el.offsetLeft;
    startY = e.touches[0].pageY;
    scrollLeft = el.scrollLeft;
    isHorizontalScroll = false;
  });
  
  el.addEventListener('touchmove', (e) => {
    const x = e.touches[0].pageX - el.offsetLeft;
    const y = e.touches[0].pageY;
    const deltaX = Math.abs(x - startX);
    const deltaY = Math.abs(y - startY);
    
    if (!isHorizontalScroll && deltaX < 10 && deltaY < 10) {
      return;
    }
    
    if (!isHorizontalScroll) {
      isHorizontalScroll = deltaX > deltaY;
    }
    
    if (isHorizontalScroll) {
      e.preventDefault();
      const walk = (x - startX) * 2;
      el.scrollLeft = scrollLeft - walk;
    }
  }, { passive: false });
};

export function Settings() {
  const { tab } = useParams<{ tab?: SettingsTab }>();
  const [activeTab, setActiveTab] = useState<SettingsTab>(tab || 'categorias');
  const { isAuthenticated, isLoading, user } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const navigate = useNavigate();
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const canAccess = hasRestrictedAccess(user?.nivel_acesso);

  // Sincronizar activeTab com o parâmetro da rota
  useEffect(() => {
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [tab, activeTab]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !company || !canAccess)) {
      navigate('/app');
      return;
    }
  }, [isLoading, isAuthenticated, company, canAccess, navigate]);

  const handleTabChange = (tab: SettingsTab) => {
    if (tab === 'whatsapp') {
      navigate('/app/whatsapp');
      return;
    }
    if (tab === 'planos') {
      navigate('/app/planos');
      return;
    }
    if (tab === 'upload') {
      navigate('/app/pessoas/importar');
      return;
    }
    if (tab === 'form') {
      navigate('/app/configuracoes/gerenciar-formulario');
      return;
    }
    // Navegar para a rota específica do módulo de configuração
    navigate(`/app/settings/${tab}`);
  };

  // Configurar scroll horizontal com touch exatamente como funcionava antes
  useEffect(() => {
    setupHorizontalScroll(mobileNavRef.current);
  }, []);

  // Centralizar aba selecionada no mobile
  useEffect(() => {
    if (!mobileNavRef.current) return;
    const activeBtn = mobileNavRef.current.querySelector<HTMLButtonElement>('[data-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeTab]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && mobileNavRef.current) {
      mobileNavRef.current.scrollLeft += e.deltaY;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-lg shadow animate-pulse">
            <div className="p-4 sm:p-6">
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
    { id: 'categorias', label: 'Categorias', icon: Cog, desc: 'Gerencie categorias de demandas e contatos' },
    { id: 'indicados', label: 'Indicados', icon: Users, desc: 'Configurações de indicados e lideranças' },
    { id: 'aniversario', label: 'Aniversário', icon: Gift, desc: 'Mensagens automáticas de felicitações' },
    { id: 'mensagens', label: 'Mensagens', icon: Send, adminOnly: true, desc: 'Configuração de notificações push para atendimentos' },
    { id: 'form', label: 'Formulário de Cadastro', icon: FormInput, isExternal: true, desc: 'Personalize o formulário público' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, isExternal: true, desc: 'Conexão e instâncias do WhatsApp' },
    { id: 'empresa', label: 'Empresa', icon: Building2, desc: 'Edite os dados da empresa atual' },
    { id: 'extensao', label: 'Extensão', icon: Chrome, desc: 'Integração com extensão do navegador' },
    { id: 'upload', label: 'Upload', icon: Upload, isExternal: true, desc: 'Importação em massa de contatos' },
    { id: 'planos', label: 'Planos', icon: CreditCard, isExternal: true, desc: 'Assinatura e limites da conta' }
  ];

  const abasDisponiveis = tabs.filter((tab) => {
    if ((tab as any).ownerOnly && user?.adm_empresa !== true) return false;
    if ((tab as any).adminOnly && user?.nivel_acesso !== 'admin') return false;
    return true;
  });

  const abaAtual = abasDisponiveis.find((t) => t.id === activeTab) || abasDisponiveis[0];
  const IconAtual = abaAtual?.icon || Cog;

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto">
        {/* Header com título */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/app')}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
                title="Voltar ao início"
                aria-label="Voltar"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  Área de Configurações
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 whitespace-nowrap truncate">
                  Personalize seu mandato
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de navegação Mobile */}
        <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-xs">
          <div
            ref={mobileNavRef}
            onWheel={handleWheel}
            className="overflow-x-auto w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex items-center gap-2 min-w-max px-4 py-3">
              {abasDisponiveis.map((tab) => {
                const Icon = tab.icon;
                const ativa = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    data-active={ativa ? 'true' : 'false'}
                    onClick={() => handleTabChange(tab.id as SettingsTab)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                      ativa
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                        : 'bg-gray-100 dark:bg-gray-700/70 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95'
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${ativa ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                    <span>{tab.label}</span>
                    {tab.isExternal && (
                      <ExternalLink className={`h-3 w-3 opacity-60 ${ativa ? 'text-white' : 'text-gray-400'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Layout Principal: 2 Colunas no Desktop (Sidebar vertical + Conteúdo) */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            {/* Sidebar Desktop */}
            <aside className="hidden lg:flex flex-col w-72 flex-shrink-0">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-3.5 h-full flex flex-col">
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Módulos de Configuração
                </div>
                <nav className="mt-1 space-y-1 flex-1">
                  {abasDisponiveis.map((tab) => {
                    const Icon = tab.icon;
                    const ativa = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id as SettingsTab)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                          ativa
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-xs'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`p-1.5 rounded-lg transition-colors ${
                              ativa
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                            }`}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                          </span>
                          <span className="truncate">{tab.label}</span>
                        </div>
                        {tab.isExternal && (
                          <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 flex-shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Painel de Conteúdo Principal */}
            <main className="flex-1 min-w-0 w-full">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6 lg:p-8">
                {/* Header da Aba Ativa */}
                <div className="flex items-center gap-3 pb-5 mb-6 border-b border-gray-100 dark:border-gray-700/60">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <IconAtual className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight">
                      {abaAtual?.label}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {abaAtual?.desc}
                    </p>
                  </div>
                </div>

                {/* Componentes */}
                <div>
                  {activeTab === 'empresa' && <CompanySettings />}
                  {activeTab === 'categorias' && <CategorySettings />}
                  {activeTab === 'indicados' && <IndicadoSettings />}
                  {activeTab === 'aniversario' && <BirthdaySettings />}
                  {activeTab === 'extensao' && <ExtensaoSettings />}
                  {activeTab === 'mensagens' && <MessageSettings />}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}