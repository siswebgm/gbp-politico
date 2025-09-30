import { useState, useEffect } from 'react';
import { 
  Menu, X, Mail, Phone, Users, MessageCircle, 
  BarChart3, Clock, Zap, Shield, Target, FileText, MapPin, 
  Facebook, Instagram, Linkedin, Send, Calendar, Star, Play, CheckCircle, AlertCircle, ChevronRight, Filter
} from 'lucide-react';
import { useEditMode } from '../../contexts/EditModeContext';
import EditableText from '../../components/EditableText';
import AdminLogin from '../../components/AdminLogin';

// Interface para o conteúdo editável
interface EditableContent {
  heroTitle: string;
  heroDescription: string;
  ctaButton: string;
  stats: Array<{ value: string; label: string }>;
  features: Array<{ title: string; description: string }>;
  benefits: Array<{ title: string; description: string }>;
  analytics: {
    title: string;
    subtitle: string;
    description: string;
    sections: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
    dashboard: {
      title: string;
      metrics: Array<{
        icon: string;
        title: string;
        subtitle: string;
        value: string;
      }>;
    };
  };
  groups: {
    title: string;
    description: string;
    items: Array<{
      title: string;
      description: string;
    }>;
  };
  pricing: {
    title: string;
    description: string;
    price: string;
    features: string[];
    button: string;
  };
  contact: {
    title: string;
    description: string;
    button: string;
  };
}

const defaultContent: EditableContent = {
  heroTitle: 'Solução Completa para Gestão de Gabinetes Políticos',
  heroDescription: 'O sistema definitivo para modernizar e otimizar a gestão do seu gabinete. Gerencie atendimentos, equipe e relacionamentos de forma inteligente e eficiente.',
  ctaButton: 'Solicitar Demonstração',
  stats: [
    { value: '500+', label: 'Gabinetes Atendidos' },
    { value: '98%', label: 'Satisfação' },
    { value: '24/7', label: 'Suporte Especializado' },
    { value: '100+', label: 'Cidades Atendidas' }
  ],
  features: [
    {
      title: 'Gestão de Atendimentos',
      description: 'Controle completo de demandas, protocolos e histórico de atendimentos aos cidadãos.'
    },
    {
      title: 'Agenda Inteligente',
      description: 'Organização de compromissos, reuniões e eventos com lembretes automáticos.'
    },
    {
      title: 'Comunicação Integrada',
      description: 'Disparos de mensagens e notificações via WhatsApp, e-mail e SMS.'
    },
    {
      title: 'Relatórios Personalizados',
      description: 'Análises detalhadas e indicadores de desempenho do gabinete.'
    },
    {
      title: 'Gestão de Equipe',
      description: 'Controle de acessos, tarefas e produtividade da equipe do gabinete.'
    },
    {
      title: 'Acesso Móvel',
      description: 'Aplicativo para gestão do gabinete em qualquer lugar, a qualquer momento.'
    }
  ],
  benefits: [
    {
      title: 'Eficiência Operacional',
      description: 'Automatize processos burocráticos e aumente a produtividade do seu gabinete em até 70%.'
    },
    {
      title: 'Atendimento de Excelência',
      description: 'Ofereça um atendimento ágil e personalizado aos cidadãos, com histórico completo de interações.'
    },
    {
      title: 'Gestão Estratégica',
      description: 'Tome decisões baseadas em dados reais e indicadores de desempenho do gabinete.'
    },
    {
      title: 'Segurança e Conformidade',
      description: 'Sistema em nuvem com criptografia de dados e backup automático, garantindo a segurança das informações.'
    }
  ],
  
  analytics: {
    title: 'Decisões Estratégicas',
    subtitle: 'Baseadas em Dados',
    description: 'Nosso CRM oferece insights valiosos que impulsionam sua administração política',
    sections: [
      {
        icon: 'map',
        title: 'Mapeamento Inteligente',
        description: 'Identifique regiões com maior concentração de eleitores e otimize suas estratégias territoriais'
      },
      {
        icon: 'chart',
        title: 'Performance em Tempo Real',
        description: 'Monitore atendimentos resolvidos, pendentes e em andamento com dashboards interativos'
      }
    ],
    dashboard: {
      title: 'Dashboard Executivo',
      metrics: [
        {
          icon: 'check',
          title: 'Atendimentos Resolvidos',
          subtitle: 'Última semana',
          value: '847'
        },
        {
          icon: 'clock',
          title: 'Em Andamento',
          subtitle: 'Em atendimento',
          value: '156'
        }
      ]
    }
  },
  
  groups: {
    title: 'Gestão de Grupos',
    description: 'Organize e gerencie grupos de contatos de forma eficiente',
    items: [
      {
        title: 'Automação Inteligente',
        description: 'Automatize o gerenciamento de grupos e a comunicação com seus contatos'
      },
      {
        title: 'Inteligência de Dados',
        description: 'Obtenha insights valiosos sobre seus grupos e melhore suas estratégias'
      },
      {
        title: 'Demonstração Completa',
        description: 'Agende uma demonstração para conhecer todas as funcionalidades do sistema'
      }
    ]
  },
  pricing: {
    title: 'Soluções Personalizadas',
    description: 'Oferecemos planos sob medida para atender às necessidades específicas do seu gabinete, independente do tamanho.',
    price: 'Sob Consulta',
    features: [
      'Implementação personalizada',
      'Treinamento completo da equipe',
      'Suporte técnico dedicado',
      'Atualizações constantes',
      'Segurança de dados em primeiro lugar',
      'Integração com outros sistemas',
      'Relatórios personalizados'
    ],
    button: 'Solicitar Proposta'
  },
  contact: {
    title: 'Pronto para modernizar seu gabinete?',
    description: 'Agende uma demonstração gratuita e descubra como nossa solução pode transformar a gestão do seu gabinete político.',
    button: 'Agendar Demonstração Gratuita'
  }
};

const ClientesPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [content, setContent] = useState<EditableContent>(() => {
    // Tenta carregar do localStorage
    if (typeof window !== 'undefined') {
      try {
        const savedContent = localStorage.getItem('landingPageContent');
        console.log('Conteúdo salvo encontrado:', savedContent);
        
        if (savedContent) {
          const parsedContent = JSON.parse(savedContent);
          console.log('Conteúdo analisado:', parsedContent);
          
          // Garante que todos os campos obrigatórios existam
          const mergedContent = { ...defaultContent, ...parsedContent };
          
          // Garante que arrays não sejam sobrescritos por undefined
          if (!parsedContent.stats) mergedContent.stats = defaultContent.stats;
          if (!parsedContent.features) mergedContent.features = defaultContent.features;
          if (!parsedContent.benefits) mergedContent.benefits = defaultContent.benefits;
          
          return mergedContent;
        }
      } catch (error) {
        console.error('Erro ao carregar conteúdo salvo:', error);
      }
    }
    
    console.log('Usando conteúdo padrão');
    return { ...defaultContent };
  });
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const { isEditMode, toggleEditMode, isAdmin } = useEditMode();

  // Logs para depuração
  console.log('Edit Mode State:', { isEditMode, isAdmin });
  
  // Função wrapper para o toggleEditMode com log
  const handleToggleEditMode = () => {
    console.log('Botão de edição clicado!');
    console.log('Estado atual:', { isEditMode, isAdmin });
    toggleEditMode();
  };

  // Função para salvar o conteúdo no localStorage
  const saveContentToLocalStorage = (contentToSave: EditableContent) => {
    try {
      // Cria um objeto seguro para serialização, removendo funções e elementos React
      const safeContent = JSON.parse(JSON.stringify(contentToSave));
      localStorage.setItem('landingPageContent', JSON.stringify(safeContent));
    } catch (error) {
      console.error('Erro ao salvar conteúdo no localStorage:', error);
    }
  };

  // Salva as alterações no localStorage sempre que o conteúdo mudar
  useEffect(() => {
    saveContentToLocalStorage(content);
  }, [content]);

  // Função para atualizar conteúdo
  const updateContent = (section: keyof EditableContent, value: any) => {
    console.log('Atualizando conteúdo:', { section, value });
    
    // Cria uma cópia profunda do conteúdo atual
    const updatedContent = JSON.parse(JSON.stringify(content));
    
    // Atualiza apenas a seção específica
    updatedContent[section] = value;
    
    console.log('Novo conteúdo:', updatedContent);
    setContent(updatedContent);
    
    // Salva no localStorage
    saveContentToLocalStorage(updatedContent);
  };

  // Função para atualizar itens de grupo
  const updateGroupItem = (index: number, field: 'title' | 'description', value: string) => {
    const updatedGroups = { ...content.groups };
    const updatedItems = [...updatedGroups.items];
    
    if (index >= 0 && index < updatedItems.length) {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };
      
      updateContent('groups', {
        ...updatedGroups,
        items: updatedItems
      });
    }
  };

  // Função para obter estatísticas formatadas
  const getStats = () => {
    if (!content.stats) return [];
    return content.stats.map((stat, index) => ({
      ...stat,
      value: stat.value || '',
      label: stat.label || '',
      icon: [
        <Users key="users" className="w-8 h-8" />,
        <Star key="star" className="w-8 h-8" />,
        <Clock key="clock" className="w-8 h-8" />,
        <MapPin key="map" className="w-8 h-8" />
      ][index % 4]
    }));
  };
  
  const stats = getStats();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const openVideoModal = () => setIsVideoModalOpen(true);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen && !(event.target as Element).closest('nav')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMenuOpen]);

  const features = [
    {
      icon: <Users className="w-10 h-10" />,
      title: "Gestão de Atendimentos",
      description: "Sistema completo para registro, acompanhamento e resolução de demandas dos cidadãos",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Calendar className="w-10 h-10" />,
      title: "Agenda Inteligente",
      description: "Controle de compromissos, reuniões e eventos com lembretes automáticos e integração com calendários",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: <MessageCircle className="w-10 h-10" />,
      title: "Comunicação Integrada",
      description: "Disparos de mensagens via WhatsApp, e-mail e SMS para cidadãos e equipe",
      gradient: "from-purple-500 to-violet-500"
    },
    {
      icon: <BarChart3 className="w-10 h-10" />,
      title: "Relatórios Personalizados",
      description: "Análises detalhadas e indicadores de desempenho do gabinete em tempo real",
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: <FileText className="w-10 h-10" />,
      title: "Gestão de Documentos",
      description: "Armazenamento seguro e organizado de documentos oficiais e processos",
      gradient: "from-indigo-500 to-blue-500"
    },
    {
      icon: <MapPin className="w-10 h-10" />,
      title: "Mapeamento de Demandas",
      description: "Visualização geográfica das demandas por região para melhor planejamento de ações",
      gradient: "from-teal-500 to-cyan-500"
    }
  ];

  const benefits = [
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Produtividade",
      description: "Reduza o tempo de atendimento em até 60% com automação de processos"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Segurança",
      description: "Dados protegidos com criptografia de ponta e backup automático"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Estratégia",
      description: "Tome decisões baseadas em dados reais e indicadores de desempenho"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Atendimento",
      description: "Melhore a experiência dos cidadãos com atendimento ágil e personalizado"
    }
  ];

  // Stats são gerados dinamicamente pela função getStats() a partir do conteúdo editável

  const containerStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '100vh',
    backgroundColor: '#fff',
    position: 'relative',
    overflowX: 'hidden'
  };

  return (
    <div style={containerStyle} className="min-h-screen bg-white relative">
      <AdminLogin />

      
      {/* Componente de login flutuante */}
      {!isAdmin && <AdminLogin />}

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrollY > 50 ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <img 
                src="https://studio.gbppolitico.com/storage/v1/object/public/gbp_vendas/gbp%20politico.png" 
                alt="GBP Político" 
                className="h-12 w-auto"
              />
            </div>
            
            {/* Botão de edição para administradores */}
            {isAdmin && (
              <div className="ml-auto flex items-center">
                <button
                  onClick={handleToggleEditMode}
                  className={`flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-medium ${
                    isEditMode 
                      ? 'bg-red-50 text-red-500 hover:bg-red-100 border-red-200' 
                      : 'bg-white/80 text-gray-500 hover:bg-gray-50 border-gray-200'
                  } border transition-all duration-200 opacity-80 hover:opacity-100 shadow-sm`}
                  title={isEditMode ? 'Sair do modo de edição' : 'Editar conteúdo'}
                >
                  {isEditMode ? (
                    <X className="h-3 w-3 mr-1.5" />
                  ) : (
                    <FileText className="h-3 w-3 mr-1.5" />
                  )}
                  <span className="hidden sm:inline">
                    {isEditMode ? 'Sair do modo de edição' : 'Editar conteúdo'}
                  </span>
                </button>
              </div>
            )}
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#inicio" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Início</a>
              <a href="#funcionalidades" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Funcionalidades</a>
              <a href="#demonstracao" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Demonstração</a>
              <a href="#contato" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-full hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 shadow-lg font-medium">
                Solicitar Demo
              </a>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={toggleMenu}
                className="text-gray-700 hover:text-blue-600 focus:outline-none p-2"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md shadow-xl border-t">
              <div className="px-4 py-6 space-y-4">
                <a href="#inicio" className="block text-gray-700 hover:text-blue-600 font-medium py-2">Início</a>
                <a href="#funcionalidades" className="block text-gray-700 hover:text-blue-600 font-medium py-2">Funcionalidades</a>
                <a href="#demonstracao" className="block text-gray-700 hover:text-blue-600 font-medium py-2">Demonstração</a>
                <a href="#contato" className="block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-full text-center font-medium">Solicitar Demo</a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-8">
              <Star className="w-4 h-4 mr-2" />
              Solução Líder em Gestão Política
            </div>
            
            <EditableText
              as="h1"
              value={content.heroTitle}
              onChange={(value) => updateContent('heroTitle', value)}
              className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight"
            />
            
            <EditableText
              as="p"
              value={content.heroDescription}
              onChange={(value) => updateContent('heroDescription', value)}
              className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed"
            />
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button 
                onClick={openVideoModal}
                className="group bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-5 rounded-full text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-2xl flex items-center gap-3"
              >
                <Play className="w-6 h-6 group-hover:scale-110 transition-transform" />
                Ver Demonstração
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <a 
                href="#contato" 
                className="group bg-white text-blue-600 border-2 border-blue-200 px-10 py-5 rounded-full text-lg font-semibold hover:bg-blue-50 hover:border-blue-300 transition-all transform hover:scale-105 shadow-xl flex items-center gap-3"
              >
                Solicitar Acesso Gratuito
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              console.log('Renderizando stat:', { index, stat, allStats: content.stats });
              return (
                <div key={index} className="text-center group">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                    {stat.icon}
                  </div>
                  <EditableText
                    value={stat.value}
                    onChange={(value) => {
                      console.log('Atualizando valor:', { index, value });
                      const updatedStats = [...content.stats];
                      updatedStats[index] = { ...updatedStats[index], value };
                      updateContent('stats', updatedStats);
                    }}
                    as="h3"
                    className="text-3xl font-bold text-gray-900 mb-2"
                  />
                  <EditableText
                    value={stat.label}
                    onChange={(value) => {
                      console.log('Atualizando label:', { index, value });
                      const updatedStats = [...content.stats];
                      updatedStats[index] = { ...updatedStats[index], label: value };
                      updateContent('stats', updatedStats);
                    }}
                    as="p"
                    className="text-gray-600 font-medium"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-32 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4 mr-2" />
              Funcionalidades Avançadas
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Tudo que você precisa em
              <span className="block text-blue-600">uma única plataforma</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ferramentas profissionais para uma gestão política moderna, eficiente e estratégica
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group relative bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100"
              >
                <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${feature.gradient} text-white rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <EditableText
                  value={feature.title}
                  onChange={(value) => {
                    const updatedFeatures = [...features];
                    updatedFeatures[index] = { ...updatedFeatures[index], title: value };
                    updateContent('features', updatedFeatures);
                  }}
                  as="h3"
                  className="text-2xl font-bold text-gray-900 mb-4"
                />
                <EditableText
                  value={feature.description}
                  onChange={(value) => {
                    const updatedFeatures = [...features];
                    updatedFeatures[index] = { ...updatedFeatures[index], description: value };
                    updateContent('features', updatedFeatures);
                  }}
                  as="p"
                  className="text-gray-600 leading-relaxed"
                />
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WhatsApp Automation Section */}
      <section className="py-32 bg-gradient-to-br from-green-50 to-emerald-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-64 h-64 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-6">
                <MessageCircle className="w-4 h-4 mr-2" />
                Automação Inteligente
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
                Comunicação via
                <span className="block text-green-600">WhatsApp Automatizada</span>
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-6 p-6 bg-white rounded-2xl shadow-lg">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Mensagens de Aniversário</h3>
                    <p className="text-gray-600">Felicitações automáticas personalizadas que fortalecem o relacionamento com eleitores</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-6 p-6 bg-white rounded-2xl shadow-lg">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl flex items-center justify-center">
                    <Filter className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Campanhas Segmentadas</h3>
                    <p className="text-gray-600">Disparos direcionados por cidade, bairro, gênero e categoria de atendimento</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-6 p-6 bg-white rounded-2xl shadow-lg">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Comunicação Estratégica</h3>
                    <p className="text-gray-600">Mensagens personalizadas para diferentes grupos e ocasiões especiais</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white p-8 rounded-3xl shadow-2xl">
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-2xl mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <MessageCircle className="w-8 h-8" />
                    <span className="font-bold text-lg">WhatsApp Business</span>
                  </div>
                  <p className="text-green-100">Automação Ativa</p>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-gray-700">🎉 Parabéns, Maria! Desejamos um feliz aniversário e muito sucesso!</p>
                    <span className="text-xs text-gray-500">Enviado automaticamente</span>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-xl border-l-4 border-purple-500">
                    <p className="text-sm text-gray-700">📢 Nova reunião no Centro - Participe e contribua com nossa comunidade!</p>
                    <span className="text-xs text-gray-500">Campanha segmentada</span>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-xl border-l-4 border-green-500">
                    <p className="text-sm text-gray-700">✅ Seu atendimento foi concluído com sucesso. Obrigado pela confiança!</p>
                    <span className="text-xs text-gray-500">Notificação automática</span>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
                  <span>Taxa de entrega: 98%</span>
                  <span>Resposta média: 2min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Por que escolher o
              <span className="block text-blue-600">GBP Político?</span>
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center group">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                  {benefit.icon}
                </div>
                <EditableText
                  value={benefit.title}
                  onChange={(value) => {
                    const updatedBenefits = [...benefits];
                    updatedBenefits[index] = { ...updatedBenefits[index], title: value };
                    updateContent('benefits', updatedBenefits);
                  }}
                  as="h3"
                  className="text-2xl font-bold text-gray-900 mb-4"
                />
                <EditableText
                  value={benefit.description}
                  onChange={(value) => {
                    const updatedBenefits = [...benefits];
                    updatedBenefits[index] = { ...updatedBenefits[index], description: value };
                    updateContent('benefits', updatedBenefits);
                  }}
                  as="p"
                  className="text-gray-600 text-lg"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="py-32 bg-gradient-to-br from-blue-900 to-indigo-900 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-full text-sm font-medium mb-6">
              <BarChart3 className="w-4 h-4 mr-2" />
              Inteligência de Dados
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Decisões Estratégicas
              <span className="block text-blue-300">Baseadas em Dados</span>
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Nosso CRM oferece insights valiosos que impulsionam sua administração política
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20">
                <MapPin className="w-12 h-12 text-blue-300 mb-4" />
                <h3 className="text-2xl font-bold mb-4">Mapeamento Inteligente</h3>
                <p className="text-blue-100 text-lg">
                  Identifique regiões com maior concentração de eleitores e otimize suas estratégias territoriais
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20">
                <BarChart3 className="w-12 h-12 text-green-300 mb-4" />
                <h3 className="text-2xl font-bold mb-4">Performance em Tempo Real</h3>
                <p className="text-blue-100 text-lg">
                  Monitore atendimentos resolvidos, pendentes e em andamento com dashboards interativos
                </p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-8 rounded-3xl border border-white/20">
              <h3 className="text-3xl font-bold mb-8 text-center">Dashboard Executivo</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-white/10 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                    <div>
                      <p className="font-semibold text-lg">Atendimentos Resolvidos</p>
                      <p className="text-blue-200">Última semana</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-green-400">847</div>
                </div>
                
                <div className="flex items-center justify-between p-6 bg-white/10 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <Clock className="w-8 h-8 text-yellow-400" />
                    <div>
                      <p className="font-semibold text-lg">Pendentes</p>
                      <p className="text-blue-200">Aguardando ação</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-yellow-400">23</div>
                </div>
                
                <div className="flex items-center justify-between p-6 bg-white/10 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <AlertCircle className="w-8 h-8 text-blue-400" />
                    <div>
                      <p className="font-semibold text-lg">Em Andamento</p>
                      <p className="text-blue-200">Processando</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-blue-400">156</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section id="demonstracao" className="py-32 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-72 h-72 bg-purple-500/20 rounded-full filter blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-full text-sm font-medium mb-8">
            <Play className="w-4 h-4 mr-2" />
            Demonstração Completa
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Veja o Sistema
            <span className="block text-blue-400">em Ação</span>
          </h2>
          
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Conheça todas as funcionalidades do nosso CRM através desta demonstração detalhada
          </p>
          
          <button
            onClick={openVideoModal}
            className="group inline-flex items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-12 py-6 rounded-full text-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-2xl"
          >
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Play className="w-8 h-8 ml-1" />
            </div>
            Assistir Demonstração Completa
          </button>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contato" className="py-32 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
        <div className="relative w-full h-full bg-gray-900">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 to-blue-800/30"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Pronto para Modernizar
            <span className="block text-blue-200">seu Gabinete Político?</span>
          </h2>
          
          <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto">
            Descubra como nossa solução pode transformar a gestão do seu gabinete, 
            tornando os processos mais ágeis, organizados e eficientes.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a 
              href="tel:+5511999999999"
              className="group bg-white text-blue-600 px-10 py-5 rounded-full text-lg font-semibold hover:bg-blue-50 transition-all transform hover:scale-105 shadow-2xl flex items-center justify-center gap-3"
            >
              <Phone className="w-6 h-6 group-hover:scale-110 transition-transform" />
              Falar com Especialista
            </a>
            <a 
              href="#formulario"
              className="group bg-blue-800 text-white px-10 py-5 rounded-full text-lg font-semibold hover:bg-blue-900 transition-all transform hover:scale-105 shadow-2xl flex items-center justify-center gap-3"
            >
              <Mail className="w-6 h-6 group-hover:scale-110 transition-transform" />
              Solicitar Demonstração
            </a>
          </div>
          
          <p className="mt-8 text-blue-100 text-sm">
            Atendimento personalizado | Suporte dedicado | Implementação ágil
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <h3 className="text-white text-lg font-semibold mb-6">GBP Gestão de Gabinetes</h3>
              <p className="text-gray-400 mb-6">A solução completa para gestão de gabinetes políticos, otimizando processos e melhorando o atendimento aos cidadãos.</p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">Facebook</span>
                  <Facebook className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">Instagram</span>
                  <Instagram className="w-6 h-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <Linkedin className="w-6 h-6" />
                </a>
                <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                  <span className="sr-only">WhatsApp</span>
                  <MessageCircle className="w-6 h-6" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-6">Navegação</h4>
              <ul className="space-y-3">
                <li><a href="#recursos" className="text-gray-400 hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#beneficios" className="text-gray-400 hover:text-white transition-colors">Benefícios</a></li>
                <li><a href="#depoimentos" className="text-gray-400 hover:text-white transition-colors">Depoimentos</a></li>
                <li><a href="#contato" className="text-gray-400 hover:text-white transition-colors">Contato</a></li>
                <li><a href="/login" className="text-gray-400 hover:text-white transition-colors">Área do Cliente</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-6">Fale Conosco</h4>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <MapPin className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-400">Av. Paulista, 1000 - 10º andar<br/>Bela Vista, São Paulo - SP<br/>CEP: 01310-100</span>
                </li>
                <li className="flex items-center">
                  <Mail className="w-5 h-5 mr-2 flex-shrink-0" />
                  <a href="mailto:contato@gbppolitico.com.br" className="text-gray-400 hover:text-white transition-colors">contato@gbppolitico.com.br</a>
                </li>
                <li className="flex items-center">
                  <Phone className="w-5 h-5 mr-2 flex-shrink-0" />
                  <a href="tel:+5511999999999" className="text-gray-400 hover:text-white transition-colors">(11) 99999-9999</a>
                </li>
                <li className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span className="text-gray-400">Seg-Sex: 9h às 18h</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-6">Receba Novidades</h4>
              <p className="text-gray-400 mb-4">Assine nossa newsletter e receba conteúdos exclusivos sobre gestão pública.</p>
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Seu melhor email" 
                  className="bg-gray-800 text-white px-4 py-3 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm"
                />
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-r-lg transition-colors flex items-center">
                  <span className="sr-only">Assinar</span>
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Respeitamos sua privacidade. Você está seguro!</p>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} GBP Gestão de Gabinetes. Todos os direitos reservados.
              <span className="block md:inline md:ml-2 text-xs">CNPJ: 12.345.678/0001-90</span>
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-4 md:mt-0">
              <a href="/termos-de-uso" className="text-gray-500 hover:text-white text-sm transition-colors">Termos de Uso</a>
              <a href="/politica-de-privacidade" className="text-gray-500 hover:text-white text-sm transition-colors">Política de Privacidade</a>
              <a href="/lgpd" className="text-gray-500 hover:text-white text-sm transition-colors">LGPD</a>
              <a href="/trocas-e-devolucoes" className="text-gray-500 hover:text-white text-sm transition-colors">Trocas e Devoluções</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl">
            <button 
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
              aria-label="Fechar vídeo"
            >
              <X className="w-8 h-8" />
            </button>
            <div className="aspect-w-16 aspect-h-9 w-full">
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <p className="text-white text-2xl md:text-3xl" style={{ zoom: 1, transform: 'translateZ(0)' }}>Vídeo demonstrativo</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientesPage;
