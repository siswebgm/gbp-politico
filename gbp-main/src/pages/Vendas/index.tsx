import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Phone, Users, FileText, MessageSquare, BarChart3, MapPin, Briefcase, ChevronLeft, ChevronRight, Instagram, Menu, X, Star, Zap, Shield, TrendingUp, Clock, Heart, ArrowDown } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  
  const scrollToClientes = (e: React.MouseEvent) => {
    e.preventDefault();
    clientesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!clientes || clientes.length === 0) return;

    const interval = setInterval(() => {
      if (carouselRef.current) {
        const nextSlide = (currentSlide + 1) % Math.ceil(clientes.length / 4);
        setCurrentSlide(nextSlide);
        carouselRef.current.scrollTo({
          left: nextSlide * (4 * 220 + 3 * 24),
          behavior: 'smooth'
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentSlide, clientes]);

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Gestão de Eleitores",
      description: "Cadastre e gerencie sua base de eleitores de forma organizada e eficiente",
      color: "from-blue-500 to-blue-600",
      stats: "10k+ Eleitores"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Categorização Inteligente",
      description: "Organize eleitores por categorias, bairros e demandas para atendimento direcionado",
      color: "from-purple-500 to-purple-600",
      stats: "50+ Categorias"
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "Atendimentos e Demandas",
      description: "Acompanhe e resolva as demandas dos eleitores com praticidade",
      color: "from-green-500 to-green-600",
      stats: "5k+ Demandas"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Relatórios Detalhados",
      description: "Análises e insights para tomada de decisões estratégicas",
      color: "from-orange-500 to-orange-600",
      stats: "100+ Relatórios"
    },
    {
      icon: <ArrowRight className="w-6 h-6" />,
      title: "Disparo de Mensagens",
      description: "Comunique-se com sua base de forma segmentada e eficaz",
      color: "from-pink-500 to-pink-600",
      stats: "1M+ Mensagens"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Segurança e Privacidade",
      description: "Seus dados protegidos com criptografia de ponta",
      color: "from-indigo-500 to-indigo-600",
      stats: "99.9% Uptime"
    }
  ];

  const benefits = [
    {
      icon: <TrendingUp className="w-5 h-5" />,
      text: "Aumente seu engajamento em 300%",
      delay: "0.1s"
    },
    {
      icon: <Clock className="w-5 h-5" />,
      text: "Economize 20h semanais de trabalho",
      delay: "0.2s"
    },
    {
      icon: <Heart className="w-5 h-5" />,
      text: "Conecte-se melhor com seus eleitores",
      delay: "0.3s"
    },
    {
      icon: <Zap className="w-5 h-5" />,
      text: "Respostas 5x mais rápidas",
      delay: "0.4s"
    }
  ];

  const scrollToSection = (e: React.MouseEvent, ref: React.RefObject<HTMLDivElement>) => {
    e.preventDefault();
    ref.current?.scrollIntoView({ behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white/90 backdrop-blur-sm'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="relative">
                <img 
                  src="https://studio.gbppolitico.com/storage/v1/object/public/neilton/1741322525040_1741322524571_gbp_politico.png"
                  alt="GBP Político"
                  className="h-8 w-auto sm:h-10 lg:h-12 object-contain transition-transform group-hover:scale-110"
                />
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg opacity-0 group-hover:opacity-20 blur transition-opacity"></div>
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900 transition-colors">
                GBP Político
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              <button 
                onClick={(e) => scrollToSection(e, recursosRef)} 
                className={`font-medium transition-all hover:scale-105 ${scrolled ? 'text-gray-700 hover:text-blue-600' : 'text-white/90 hover:text-white'}`}
              >
                Recursos
              </button>
              <button 
                onClick={(e) => scrollToSection(e, clientesRef)} 
                className={`font-medium transition-all hover:scale-105 ${scrolled ? 'text-gray-700 hover:text-blue-600' : 'text-white/90 hover:text-white'}`}
              >
                Clientes
              </button>
              <Link 
                to="/sobre" 
                className={`font-medium transition-all hover:scale-105 ${scrolled ? 'text-gray-700 hover:text-blue-600' : 'text-white/90 hover:text-white'}`}
              >
                Sobre
              </Link>
              <Link
                to="/login"
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-600 transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25"
              >
                Login
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`lg:hidden p-2 rounded-lg transition-all ${scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          <div className={`lg:hidden transition-all duration-300 overflow-hidden ${isMobileMenuOpen ? 'max-h-64 mb-4' : 'max-h-0'}`}>
            <div className={`py-4 space-y-3 rounded-xl ${scrolled ? 'bg-white/80 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md'} shadow-xl`}>
              <button 
                onClick={(e) => scrollToSection(e, recursosRef)} 
                className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all font-medium"
              >
                Recursos
              </button>
              <button 
                onClick={(e) => scrollToSection(e, clientesRef)} 
                className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all font-medium"
              >
                Clientes
              </button>
              <Link 
                to="/sobre" 
                className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all font-medium"
              >
                Sobre
              </Link>
              <Link
                to="/login"
                className="block w-full text-left px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-600 transition-all"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-50 to-white py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Content */}
            <div className="text-center lg:text-left space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-blue-700 font-medium text-sm">
                <Star className="w-4 h-4" />
                #1 Sistema para Gestão Política
              </div>

              {/* Main Title */}
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  <span className="block">Transforme sua</span>
                  <span className="block text-blue-600">Gestão Política</span>
                </h1>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-700">
                  e conquiste mais votos
                </div>
              </div>

              {/* Description */}
              <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                A plataforma que <span className="text-blue-600 font-semibold">+500 políticos</span> usam para gerenciar eleitores, demandas e comunicações de forma estratégica.
              </p>

              {/* Social Proof Numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-6">
                {[
                  { number: "500+", label: "Políticos" },
                  { number: "50K+", label: "Eleitores" },
                  { number: "100+", label: "Cidades" },
                  { number: "98%", label: "Satisfação" }
                ].map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl lg:text-3xl font-bold text-blue-600">
                      {stat.number}
                    </div>
                    <div className="text-gray-600 text-sm mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-6">
                <button
                  onClick={() => setIsContactModalOpen(true)}
                  className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all duration-300 hover:scale-105 w-full sm:w-auto text-lg shadow-lg"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Zap className="w-5 h-5" />
                    <span>AGENDAR DEMONSTRAÇÃO</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </button>
                
                <div className="flex items-center gap-3">
                  <a
                    href="https://wa.me/5581979146126?text=Olá! Vim pelo site e quero agendar uma demonstração do GBP Político"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all duration-300"
                  >
                    <div className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      <span>WhatsApp</span>
                    </div>
                  </a>
                  <div className="text-gray-600 text-sm">
                    Resposta em 5min
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4">
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Dados seguros</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>Suporte 24/7</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Resultados comprovados</span>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative">
              {/* Main Device */}
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="relative bg-gray-100 rounded-2xl p-2 shadow-xl">
                  <div className="relative bg-white rounded-xl overflow-hidden">
                    <div className="aspect-[16/10]">
                      <img
                        src="https://studio.gbppolitico.com/storage/v1/object/public/neilton/1741323908550_1741323908236_localhost_3000_app_eleitores.png"
                        alt="GBP Político Dashboard"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Mobile Device */}
                <div className="absolute -right-4 sm:-right-8 lg:-right-12 bottom-8 w-1/3 max-w-[120px] lg:max-w-[140px]">
                  <div className="relative bg-gray-100 rounded-2xl p-1.5 shadow-lg">
                    <div className="relative bg-white rounded-xl overflow-hidden">
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
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" ref={recursosRef} className="relative py-20 lg:py-32 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-700 font-medium text-sm mb-6">
                <Zap className="w-4 h-4" />
                Funcionalidades
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Recursos que
                <span className="block text-blue-600">fazem a diferença</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Uma plataforma completa para gestão política moderna
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-8 rounded-2xl bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Icon */}
                  <div className={`mb-6 p-4 rounded-xl bg-blue-500 text-white w-fit`}>
                    {feature.icon}
                  </div>
                  
                  {/* Stats Badge */}
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-600 mb-4">
                    {feature.stats}
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-xl font-bold mb-3 text-gray-900">
                    {feature.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="text-center mt-16">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-blue-50 rounded-full">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{i}</span>
                    </div>
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  <span className="text-blue-600 font-bold">+500 políticos</span> usam nossa plataforma
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="relative py-20 lg:py-32 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-full text-yellow-700 font-medium text-sm mb-6">
                <Star className="w-4 h-4" />
                Depoimentos
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                O que nossos
                <span className="block text-yellow-600">clientes dizem</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Histórias reais de políticos que transformaram suas gestões
              </p>
            </div>

            {/* Testimonials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  name: "João Silva",
                  role: "Vereador - Recife/PE",
                  content: "O GBP Político revolucionou meu atendimento. Consigo gerenciar 3x mais demandas com menos tempo.",
                  rating: 5,
                  avatar: "JS"
                },
                {
                  name: "Maria Santos",
                  role: "Deputada - Caruaru/PE",
                  content: "A ferramenta de disparo me ajudou a manter comunicação constante. Resultado: 40% mais engajamento.",
                  rating: 5,
                  avatar: "MS"
                },
                {
                  name: "Pedro Oliveira",
                  role: "Prefeito - Gravatá/PE",
                  content: "Os relatórios me deram visão estratégica que nunca tive. Consigo tomar decisões baseadas em dados.",
                  rating: 5,
                  avatar: "PO"
                }
              ].map((testimonial, index) => (
                <div
                  key={index}
                  className="p-8 rounded-2xl bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Rating Stars */}
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  
                  {/* Content */}
                  <p className="text-gray-700 leading-relaxed mb-6 text-lg">
                    "{testimonial.content}"
                  </p>
                  
                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="text-center mt-16">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-yellow-50 rounded-full">
                <div className="flex -space-x-2">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className="w-8 h-8 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
                      <Star className="w-4 h-4 text-white" />
                    </div>
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  <span className="text-yellow-600 font-bold">4.9/5 estrelas</span> de 500+ avaliações
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Section */}
      <div id="clientes" ref={clientesRef} className="relative py-20 lg:py-32 bg-gradient-to-b from-gray-50 to-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(147,51,234,0.03),transparent_50%)]"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-16 lg:mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-blue-50 rounded-full text-green-700 font-medium text-sm mb-6 border border-green-200">
                <Heart className="w-4 h-4" />
                Clientes Satisfeitos
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-6">
                Quem confia em
                <span className="block bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">nosso sistema</span>
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Conheça nossos clientes que otimizam a gestão de seus gabinetes
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-16">
              {[
                { number: "500+", label: "Políticos", color: "from-blue-500 to-blue-600" },
                { number: "50k+", label: "Eleitores", color: "from-green-500 to-green-600" },
                { number: "100+", label: "Cidades", color: "from-purple-500 to-purple-600" },
                { number: "4.9/5", label: "Avaliação", color: "from-orange-500 to-orange-600" }
              ].map((stat, index) => (
                <div key={index} className="relative p-6 rounded-2xl bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 rounded-2xl`}></div>
                  <div className="relative">
                    <div className={`text-2xl lg:text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                      {stat.number}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Clients Carousel */}
            <div className="relative">
              {/* Navigation Buttons */}
              {!isLoading && clientes && clientes.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      const prevSlide = currentSlide === 0 ? Math.ceil(clientes.length / 4) - 1 : currentSlide - 1;
                      setCurrentSlide(prevSlide);
                      carouselRef.current?.scrollTo({
                        left: prevSlide * (4 * 220 + 3 * 24),
                        behavior: 'smooth'
                      });
                    }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors hidden lg:flex"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={() => {
                      const nextSlide = (currentSlide + 1) % Math.ceil(clientes.length / 4);
                      setCurrentSlide(nextSlide);
                      carouselRef.current?.scrollTo({
                        left: nextSlide * (4 * 220 + 3 * 24),
                        behavior: 'smooth'
                      });
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors hidden lg:flex"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </>
              )}

              {/* Carousel Container */}
              <div className="relative overflow-hidden rounded-2xl">
                <div 
                  ref={carouselRef}
                  className="flex pb-8 -mx-6 px-6 transition-transform duration-500 ease-in-out"
                  style={{
                    width: 'calc(100% + 48px)',
                    transform: `translateX(-${currentSlide * (4 * 220 + 3 * 24)}px)`
                  }}
                >
                  <div className="flex gap-6">
                    {isLoading ? (
                      // Loading Skeletons
                      Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="w-[220px] bg-white rounded-2xl p-4 shadow-lg animate-pulse">
                          <div className="relative mb-4">
                            <div className="aspect-[4/5] rounded-xl overflow-hidden">
                              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300"></div>
                            </div>
                            <div className="absolute bottom-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                              Partido
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                          </div>
                        </div>
                      ))
                    ) : clientes?.map((cliente) => (
                      <div key={cliente.uid} className="w-[220px] bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 group snap-start">
                        <div className="relative mb-4">
                          <div className="aspect-[4/5] rounded-xl overflow-hidden">
                            <img
                              src={cliente.foto}
                              alt={cliente.nome}
                              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                            {cliente.partido}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {cliente.nome}
                          </h3>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <Briefcase className="w-4 h-4 flex-shrink-0" />
                            <span className="line-clamp-1">{cliente.cargo}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="line-clamp-1">{cliente.cidade}, {cliente.uf}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dots Indicator */}
              {!isLoading && clientes && clientes.length > 0 && (
                <div className="flex justify-center gap-2 mt-8">
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
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        index === currentSlide 
                          ? 'bg-blue-600 w-8' 
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="relative py-20 lg:py-32 bg-blue-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white font-medium text-sm mb-6">
              <Zap className="w-4 h-4" />
              Comece Agora
            </div>

            {/* Main Title */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Pronto para transformar sua
              <span className="block text-yellow-300">gestão política</span>?
            </h2>
            
            {/* Description */}
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              Junte-se a <span className="text-yellow-300 font-semibold">+500 políticos</span> que já estão transformando suas gestões.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="px-8 py-4 bg-yellow-400 text-gray-900 rounded-xl font-bold hover:bg-yellow-300 transition-all duration-300 hover:scale-105 w-full sm:w-auto text-lg shadow-lg"
              >
                <div className="flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5" />
                  <span>AGENDAR DEMONSTRAÇÃO</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </button>
              
              <div className="flex items-center gap-3">
                <a
                  href="https://wa.me/5581979146126?text=Olá! Vim pelo site e quero agendar uma demonstração do GBP Político"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    <span>WhatsApp</span>
                  </div>
                </a>
                <div className="text-white/80 text-sm">
                  Resposta em 5min
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-white/90">
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-5 h-5 text-yellow-300" />
                <span className="text-sm font-medium">Garantia de 7 dias</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-yellow-300" />
                <span className="text-sm font-medium">Suporte prioritário</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5 text-yellow-300" />
                <span className="text-sm font-medium">Resultados em 30 dias</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative bg-gray-900 text-white py-12 lg:py-16">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05),transparent_70%)]"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img 
                  src="https://studio.gbppolitico.com/storage/v1/object/public/neilton/1741322525040_1741322524571_gbp_politico.png"
                  alt="GBP Político"
                  className="h-10 w-auto object-contain"
                />
                <span className="text-xl font-bold">GBP Político</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                A solução completa para gestão de gabinetes políticos modernos.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://wa.me/5581979146126"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                >
                  <Phone className="w-5 h-5" />
                </a>
                <a
                  href="https://www.instagram.com/jmsolucoes.tech/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Produto</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><button onClick={(e) => scrollToSection(e, recursosRef)} className="hover:text-white transition-colors">Recursos</button></li>
                <li><button onClick={(e) => scrollToSection(e, clientesRef)} className="hover:text-white transition-colors">Clientes</button></li>
                <li><Link to="/sobre" className="hover:text-white transition-colors">Sobre</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contato</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>(81) 97914-6126</span>
                </li>
                <li className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp</span>
                </li>
                <li className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  <span>@jmsolucoes.tech</span>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Legal</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to="/termos-uso" className="hover:text-white transition-colors">Termos de Uso</Link></li>
                <li><Link to="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2024 GBP Político. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full animate-fade-in shadow-2xl border border-gray-100">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                Fale com um especialista
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Deixe seus dados que entraremos em contato para uma demonstração personalizada.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome completo
                </label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="(XX) XXXXX-XXXX"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                  value={whatsapp}
                  onChange={handleWhatsAppChange}
                  maxLength={15}
                  required
                />
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
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
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Enviando...
                    </span>
                  ) : (
                    'Enviar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
