import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Phone, Users, FileText, MessageSquare, BarChart3, MapPin, Briefcase, ChevronLeft, ChevronRight, Instagram } from 'lucide-react';
import { useClientesPublicidade } from '../../hooks/useClientesPublicidade';
import { toast } from 'react-hot-toast';

export function VendasPage() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const { data: clientes, isLoading } = useClientesPublicidade();
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const clientesRef = useRef<HTMLDivElement>(null);
  const recursosRef = useRef<HTMLDivElement>(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [nome, setNome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatWhatsApp = (value: string) => {
    // Remove tudo que não for número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara
    if (numbers.length <= 11) {
      return numbers.replace(
        /(\d{2})(\d{0,5})(\d{0,4})/,
        function(match, p1, p2, p3) {
          if (p3) return `(${p1}) ${p2}-${p3}`;
          if (p2) return `(${p1}) ${p2}`;
          if (p1) return `(${p1}`;
          return '';
        }
      );
    }
    return numbers.slice(0, 11);
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setWhatsapp(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !whatsapp) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('https://whkn8n.guardia.work/webhook/gbp_vendas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome,
          whatsApp: whatsapp,
        }),
      });

      if (response.ok) {
        setNome('');
        setWhatsapp('');
        setIsContactModalOpen(false);
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-medium">Recebemos sua solicitação!</span>
            <span className="text-sm text-gray-500">
              Em breve nossa equipe entrará em contato com você.
            </span>
          </div>,
          {
            duration: 5000,
            position: 'bottom-right',
          }
        );
      }
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      toast.error('Ops! Algo deu errado. Tente novamente em instantes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToSection = (e: React.MouseEvent, ref: React.RefObject<HTMLDivElement>) => {
    e.preventDefault();
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToClientes = (e: React.MouseEvent) => {
    e.preventDefault();
    clientesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!clientes || clientes.length === 0) return;

    const interval = setInterval(() => {
      if (carouselRef.current) {
        const nextSlide = (currentSlide + 1) % Math.ceil(clientes.length / 4);
        setCurrentSlide(nextSlide);
        carouselRef.current.scrollTo({
          left: nextSlide * (4 * 220 + 3 * 24), // 4 cards de 220px + 3 gaps de 24px
          behavior: 'smooth'
        });
      }
    }, 5000); // Muda a cada 5 segundos

    return () => clearInterval(interval);
  }, [currentSlide, clientes]);

  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "Gestão de Eleitores",
      description: "Cadastre e gerencie sua base de eleitores de forma organizada e eficiente"
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Categorização Inteligente",
      description: "Organize eleitores por categorias, bairros e demandas para atendimento direcionado"
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Atendimentos e Demandas",
      description: "Acompanhe e resolva as demandas dos eleitores com praticidade"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Relatórios Detalhados",
      description: "Análises e insights para tomada de decisões estratégicas"
    },
    {
      icon: <ArrowRight className="w-8 h-8" />,
      title: "Disparo de Mensagens",
      description: "Comunique-se com sua base de forma segmentada e eficaz"
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      title: "Acesso Multi-usuário",
      description: "Gerencie sua equipe com diferentes níveis de acesso"
    }
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-blue-600">
        <div className="container mx-auto px-6 sm:px-8 md:px-10 lg:px-12 max-w-[1400px]">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link to="/" className="flex items-center gap-3">
              <img 
                src="https://studio.gbppolitico.com/storage/v1/object/public/neilton/1741322525040_1741322524571_gbp_politico.png"
                alt="GBP Político"
                className="h-10 w-auto object-contain"
              />
              <span className="text-lg font-semibold text-white">GBP Político</span>
            </Link>

            <div className="flex items-center gap-4 sm:gap-6">
              <div className="hidden sm:flex items-center gap-6">
                <button onClick={(e) => scrollToSection(e, recursosRef)} className="text-white/90 hover:text-white transition-colors">
                  Recursos
                </button>
                <button onClick={(e) => scrollToSection(e, clientesRef)} className="text-white/90 hover:text-white transition-colors">
                  Clientes
                </button>
                <Link to="/sobre" className="text-white/90 hover:text-white transition-colors">
                  Sobre
                </Link>
              </div>

              <Link
                to="/login"
                className="px-4 py-2 bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-800 transition-colors border border-blue-500/30"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Conteúdo da página */}
      <div className="w-full h-[calc(100vh-4rem)] mt-16 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {/* Hero Section */}
        <div className="w-full min-h-[calc(100vh-4rem)] flex items-center">
          <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-10 max-w-7xl py-12 sm:py-16 md:py-20 lg:py-24">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 lg:gap-12 items-center">
                {/* Conteúdo à esquerda */}
                <div className="text-left space-y-6 md:space-y-8 order-2 md:order-1 md:pr-6 lg:pr-10">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                    Sistema de
                    Gerenciamento
                    para Gabinete
                    Político
                  </h1>
                  
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed max-w-2xl">
                    Otimize a gestão do seu gabinete político com nossa solução completa
                    de CRM. Gerencie eleitores, documentos e comunicações de forma
                    eficiente.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button
                      onClick={() => setIsContactModalOpen(true)}
                      className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-semibold overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/25"
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.3),rgba(255,255,255,0)_45%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                      <div className="relative flex items-center gap-2">
                        <span>Agende uma Demonstração</span>
                        <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Imagem à direita */}
                <div className="relative order-1 md:order-2 md:pl-4 lg:pl-6">
                  <div className="relative z-10 mx-auto max-w-2xl md:max-w-none">
                    {/* Notebook */}
                    <div className="relative mx-auto w-[85%] sm:w-[80%] md:w-[90%] lg:w-[95%]">
                      <div className="relative bg-gray-900 rounded-lg sm:rounded-xl p-1.5 sm:p-2 md:p-3 shadow-xl">
                        {/* Tela */}
                        <div className="relative bg-white rounded-md overflow-hidden">
                          <div className="aspect-[16/10]">
                            <img
                              src="https://studio.gbppolitico.com/storage/v1/object/public/neilton/1741323908550_1741323908236_localhost_3000_app_eleitores.png"
                              alt="GBP Político Dashboard"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                        {/* Base do notebook */}
                        <div className="absolute -bottom-1 sm:-bottom-1.5 left-1/2 transform -translate-x-1/2 w-[101%] h-0.5 bg-gray-800 rounded-b-lg"></div>
                        <div className="absolute -bottom-2 sm:-bottom-2.5 left-1/2 transform -translate-x-1/2 w-[102%] h-0.5 bg-gray-700 rounded-b-lg"></div>
                      </div>
                    </div>

                    {/* Smartphone */}
                    <div className="absolute right-0 sm:right-0 md:right-0 bottom-0 w-1/4 max-w-[120px] sm:max-w-[140px] md:max-w-[160px]">
                      <div className="relative bg-gray-900 rounded-lg sm:rounded-xl p-1.5 sm:p-2 md:p-3 shadow-xl">
                        <div className="absolute top-6 sm:top-8 left-1/2 transform -translate-x-1/2 w-2 sm:w-3 h-0.5 bg-gray-800 rounded-full"></div>
                        <div className="relative bg-white rounded-md overflow-hidden">
                          <div className="aspect-[9/19]">
                            <img
                              src="https://studio.gbppolitico.com/storage/v1/object/public/neilton/1741323018183_1741323017866_localhost_3000_app.png"
                              alt="GBP Político Mobile"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Efeitos decorativos */}
                  <div className="absolute -inset-4 bg-blue-100/30 rounded-xl -z-10 blur-2xl"></div>
                  <div className="absolute -inset-4 bg-purple-100/20 rounded-xl -z-10 blur-3xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" ref={recursosRef} className="w-full bg-white">
          <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-10 max-w-7xl py-16 sm:py-20 md:py-24">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12 sm:mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-700 font-medium text-sm mb-4">
                  Funcionalidades
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                  Recursos que fazem a diferença
                </h2>
                <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
                  Uma plataforma completa para uma gestão política moderna e eficiente
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="group relative p-6 rounded-xl bg-white border border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))] rounded-xl"></div>
                    <div className="relative">
                      <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-blue-600 w-fit group-hover:scale-110 transition-all duration-300">
                        {feature.icon}
                      </div>
                      <h3 className="text-xl font-semibold mb-2 text-gray-900 group-hover:text-blue-600 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 group-hover:text-gray-700 transition-colors">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Seção de Clientes */}
        <div id="clientes" ref={clientesRef} className="w-full py-20 sm:py-24 bg-gradient-to-b from-white to-gray-50/50">
          <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-10 max-w-7xl">
            <div className="max-w-6xl mx-auto">
              {/* Cabeçalho da seção */}
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  Quem Confia em Nosso Sistema
                </h2>
                <p className="text-gray-600 text-lg sm:text-xl max-w-3xl mx-auto px-4">
                  Conheça nossos clientes que otimizam a gestão de seus gabinetes.
                </p>
              </div>

              {/* Grid de clientes */}
              <div className="relative overflow-hidden">
                <div 
                  ref={carouselRef}
                  className="flex pb-8 -mx-6 px-6 transition-transform duration-500 ease-in-out"
                  style={{
                    width: 'calc(100% + 48px)', // Compensar o -mx-6 px-6
                    transform: `translateX(-${currentSlide * (4 * 220 + 3 * 24)}px)`
                  }}
                >
                  <div className="flex gap-6">
                    {isLoading ? (
                      // Esqueleto de carregamento
                      Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="w-[220px] bg-white rounded-lg p-3 shadow animate-pulse">
                          <div className="relative mb-3">
                            <div className="aspect-[4/5] rounded-md overflow-hidden">
                              <div className="w-full h-full bg-gray-200"></div>
                            </div>
                            <div className="absolute bottom-1.5 left-1.5 bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                              Partido
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                          </div>
                        </div>
                      ))
                    ) : clientes?.map((cliente) => (
                      <div key={cliente.uid} className="w-[220px] bg-white rounded-lg p-3 shadow hover:shadow-md transition-shadow group snap-start">
                        <div className="relative mb-3">
                          <div className="aspect-[4/5] rounded-md overflow-hidden">
                            <img
                              src={cliente.foto}
                              alt={cliente.nome}
                              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                          <div className="absolute bottom-2 left-2 bg-blue-600 text-white px-2.5 py-0.5 rounded text-sm font-medium">
                            {cliente.partido}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-base font-bold text-gray-900 line-clamp-1">{cliente.nome}</h3>
                          <div className="flex items-center gap-1 text-gray-600 text-xs">
                            <Briefcase className="w-3 h-3" />
                            <span className="line-clamp-1">{cliente.cargo}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600 text-xs">
                            <MapPin className="w-3 h-3" />
                            <span className="line-clamp-1">{cliente.cidade}, {cliente.uf}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Indicadores de rolagem */}
                {!isLoading && clientes && clientes.length > 0 && (
                  <>
                    <div className="flex justify-center gap-2 mt-6">
                      {Array.from({ length: Math.ceil(clientes.length / 4) }).map((_, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setCurrentSlide(index);
                            carouselRef.current?.scrollTo({
                              left: index * (4 * 220 + 3 * 24),
                              behavior: 'smooth'
                            });
                          }}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentSlide ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="w-full py-20 sm:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
            {/* Elementos decorativos */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-overlay filter blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
            </div>
          </div>

          <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-10 max-w-7xl relative z-10">
            <div className="max-w-6xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/90 font-medium text-sm mb-6 backdrop-blur-sm">
                Comece Agora
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Pronto para transformar sua
                <span className="bg-gradient-to-r from-blue-200 to-blue-100 bg-clip-text text-transparent"> gestão política</span>?
              </h2>
              <p className="text-lg sm:text-xl text-blue-100/90 mb-10 max-w-2xl mx-auto">
                Junte-se a diversos políticos que já otimizaram seus gabinetes com nossa solução
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setIsContactModalOpen(true)}
                  className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-semibold overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/25"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.3),rgba(255,255,255,0)_45%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <div className="relative flex items-center gap-2">
                    <span>Agende uma Demonstração</span>
                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </button>
                
                <div className="flex items-center gap-3">
                  <a
                    href="https://wa.me/5581979146126"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/25"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.3),rgba(255,255,255,0)_45%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    <div className="relative flex items-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      <span>WhatsApp</span>
                    </div>
                  </a>
                  <a
                    href="https://www.instagram.com/jmsolucoes.tech/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-pink-500/25"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.3),rgba(255,255,255,0)_45%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    <div className="relative flex items-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      <span>Instagram</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full py-8 bg-gray-900 text-center">
          <p className="text-gray-400"> 2024 GBP Político. Todos os direitos reservados.</p>
        </footer>
      </div>

      {/* Modal de Contato */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full animate-fade-in shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Fale com um especialista
            </h3>
            <p className="text-gray-600 mb-6">
              Deixe seus dados que entraremos em contato para uma demonstração personalizada.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Nome"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
              <input
                type="tel"
                placeholder="WhatsApp (XX) XXXXX-XXXX"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={whatsapp}
                onChange={handleWhatsAppChange}
                maxLength={15}
                required
              />
              <div className="flex justify-end gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !nome || !whatsapp}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
