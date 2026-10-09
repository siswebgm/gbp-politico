import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCompanyStore } from '../../store/useCompanyStore';
import { eleitorStatsService, EleitorStats, CidadeCrescimento, IndicadoCrescimento, CategoriaCrescimento, BairroCrescimento, ZonaSecaoCrescimento, ConfiabilidadeCrescimento, UsuarioCrescimento } from '../../services/eleitorStats';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ChevronLeft, ChevronDown, Loader2, Download, Users2, Building2, Home, MapPin, ThumbsUp, UserCircle2, FileSpreadsheet, FileText, MoreVertical, Cake, Tag, TrendingUp, TrendingDown, Calendar, Search, ArrowUp, ClipboardCheck, Route, BarChart3, Table2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, PieChart, Pie, Cell, Legend } from 'recharts';
import * as ExcelJS from 'exceljs';
import { TablePagination } from '../../components/TablePagination';
import { useAuth } from '../../providers/AuthProvider';
import { hasRestrictedAccess } from '../../constants/accessLevels';
import { supabaseClient } from '../../lib/supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Persiste a visualização (tabela/gráfico) de cada seção entre recarregamentos
const useViewState = (key: string) => {
  const storageKey = `report-view-${key}`;
  const [view, setView] = useState<'tabela' | 'grafico'>(() =>
    (localStorage.getItem(storageKey) as 'tabela' | 'grafico') || 'tabela'
  );
  const update = (v: 'tabela' | 'grafico') => {
    setView(v);
    localStorage.setItem(storageKey, v);
  };
  return [view, update] as const;
};

// Detecta mudanças de tema (classe .dark no <html>) para adaptar os gráficos
const useIsDark = () => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
};

// Helper para adicionar scroll horizontal com touch
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

// Seções exibidas na barra de navegação rápida do relatório
const secoesNavegacao = [
  { id: 'secao-faixa-etaria', label: 'Faixa Etária' },
  { id: 'secao-cidades', label: 'Cidades' },
  { id: 'secao-indicados', label: 'Indicados' },
  { id: 'secao-categorias', label: 'Categorias' },
  { id: 'secao-bairros', label: 'Bairros' },
  { id: 'secao-logradouros', label: 'Logradouros' },
  { id: 'secao-zonas', label: 'Zonas/Seções' },
  { id: 'secao-atendimentos', label: 'Atendimentos' },
  { id: 'secao-confiabilidade', label: 'Confiabilidade' },
  { id: 'secao-aniversariantes', label: 'Aniversariantes' },
  { id: 'secao-usuarios', label: 'Usuários' },
];

// Retorna o elemento que de fato rola o conteúdo da página
// (no Layout, é o <main> com overflow-y: auto — não a window)
const getPageScroller = (): HTMLElement =>
  (document.querySelector('main') as HTMLElement) ?? document.documentElement;

// Normaliza texto para busca: remove acentos, ignora maiúsculas e colapsa espaços
const normalizarBusca = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// Filtra uma lista pelo texto digitado (ignora acentos, maiúsculas e espaços extras)
const filtrarLista = <T,>(lista: T[], busca: string, campo: (item: T) => string): T[] => {
  const termo = normalizarBusca(busca);
  if (!termo) return lista;
  return lista.filter(item => normalizarBusca(campo(item) || '').includes(termo));
};

export function PessoasReport() {
  const navigate = useNavigate();
  const { company } = useCompanyStore();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EleitorStats | null>(null);
  const [crescimentoCidades, setCrescimentoCidades] = useState<CidadeCrescimento[]>([]);
  const [crescimentoIndicados, setCrescimentoIndicados] = useState<IndicadoCrescimento[]>([]);
  const [crescimentoCategorias, setCrescimentoCategorias] = useState<CategoriaCrescimento[]>([]);
  const [crescimentoBairros, setCrescimentoBairros] = useState<BairroCrescimento[]>([]);
  const [crescimentoZonasSecoes, setCrescimentoZonasSecoes] = useState<ZonaSecaoCrescimento[]>([]);
  const [crescimentoConfiabilidade, setCrescimentoConfiabilidade] = useState<ConfiabilidadeCrescimento[]>([]);
  const [crescimentoUsuarios, setCrescimentoUsuarios] = useState<UsuarioCrescimento[]>([]);
  const [loadingCrescimento, setLoadingCrescimento] = useState(false);
  const [loadingCrescimentoIndicados, setLoadingCrescimentoIndicados] = useState(false);
  const [loadingCrescimentoCategorias, setLoadingCrescimentoCategorias] = useState(false);
  const [loadingCrescimentoBairros, setLoadingCrescimentoBairros] = useState(false);
  const [loadingCrescimentoZonasSecoes, setLoadingCrescimentoZonasSecoes] = useState(false);
  const [loadingCrescimentoConfiabilidade, setLoadingCrescimentoConfiabilidade] = useState(false);
  const [loadingCrescimentoUsuarios, setLoadingCrescimentoUsuarios] = useState(false);
  const [bairroPages, setBairroPages] = useState<Record<string, number>>({});
  const [openMenuBairro, setOpenMenuBairro] = useState<string | null>(null);
  const [openMenuCidade, setOpenMenuCidade] = useState<string | null>(null);
  const [openMenuUsuario, setOpenMenuUsuario] = useState<string | null>(null);
  const [openMenuConfiabilidade, setOpenMenuConfiabilidade] = useState<string | null>(null);
  const [openMenuIndicado, setOpenMenuIndicado] = useState<string | null>(null);
  const [openMenuZona, setOpenMenuZona] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [aniversariantes, setAniversariantes] = useState<any[]>([]);
  // Cache dos eleitores carregados uma única vez e reutilizado por
  // todas as agregações da página (stats, crescimento, aniversariantes)
  const [eleitoresBase, setEleitoresBase] = useState<any[]>([]);
  const [loadingAniversariantes, setLoadingAniversariantes] = useState(false);
  const [openMenuAniversariante, setOpenMenuAniversariante] = useState<boolean>(false);
  const [aniversariantesPage, setAniversariantesPage] = useState(1);
  const [generoFilter, setGeneroFilter] = useState<'all' | 'MASCULINO' | 'FEMININO' | 'hoje' | '7dias' | '15dias'>('all');
  const [categorias, setCategorias] = useState<Array<{
    categoria_uid: string;
    nome: string;
    tipo: string | null;
    total: number;
  }>>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [openMenuCategoria, setOpenMenuCategoria] = useState<string | null>(null);
  const [categoriaPage, setCategoriaPage] = useState(1);
  // Menu de exportação dos cards de faixa etária
  const [openMenuFaixa, setOpenMenuFaixa] = useState<string | null>(null);
  // Buscas rápidas dentro das tabelas do relatório
  const [buscaCidade, setBuscaCidade] = useState('');
  const [cidadeView, setCidadeView] = useViewState('cidades');
  const [buscaBairro, setBuscaBairro] = useState('');
  const [bairroView, setBairroView] = useViewState('bairros');
  const [buscaLogradouro, setBuscaLogradouro] = useState('');
  const [logradouroView, setLogradouroView] = useViewState('logradouros');
  const [logradouroPage, setLogradouroPage] = useState(1);
  const [logradouroExpandido, setLogradouroExpandido] = useState<string | null>(null);
  const [openMenuLogradouro, setOpenMenuLogradouro] = useState<string | null>(null);
  const [atendimentosVisiveis, setAtendimentosVisiveis] = useState<Record<string, boolean>>({});
  const [topEleitoresView, setTopEleitoresView] = useViewState('top-eleitores');
  const [confiabilidadeView, setConfiabilidadeView] = useViewState('confiabilidade');
  const [buscaIndicado, setBuscaIndicado] = useState('');
  const [indicadoView, setIndicadoView] = useViewState('indicados');
  const [buscaCategoria, setBuscaCategoria] = useState('');
  const [categoriaView, setCategoriaView] = useViewState('categorias');
  const [buscaZona, setBuscaZona] = useState('');
  const [zonaView, setZonaView] = useViewState('zonas');
  const [buscaUsuario, setBuscaUsuario] = useState('');
  const [usuarioView, setUsuarioView] = useViewState('usuarios');
  const [faixaEtariaView, setFaixaEtariaView] = useViewState('faixa-etaria');
  const [qualidadeView, setQualidadeView] = useViewState('qualidade');
  const [mostrarTopo, setMostrarTopo] = useState(false);
  
  const canAccess = hasRestrictedAccess(user?.nivel_acesso);

  // Cores dos gráficos adaptadas ao tema claro/escuro
  const isDark = useIsDark();
  const chartGrid = isDark ? '#374151' : '#e5e7eb';
  const chartTick = isDark ? '#d1d5db' : '#374151';
  const chartLabel = isDark ? '#e5e7eb' : '#4b5563';
  const tooltipStyle = {
    borderRadius: 8,
    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    fontSize: 13,
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    color: isDark ? '#e5e7eb' : '#374151'
  };

  // Calcula a idade a partir da data de nascimento (formato yyyy-mm-dd)
  const calcularIdade = (nascimento?: string | null): number | null => {
    if (!nascimento) return null;
    const [ano, mes, dia] = String(nascimento).split('-').map(Number);
    if (!ano) return null;
    const hoje = new Date();
    let idade = hoje.getFullYear() - ano;
    const jaFezAniversario =
      hoje.getMonth() + 1 > mes ||
      (hoje.getMonth() + 1 === mes && hoje.getDate() >= dia);
    if (!jaFezAniversario) idade--;
    return idade;
  };

  // Filtra os eleitores de uma faixa etária usando o cache em memória
  const filtrarPorFaixaEtaria = (faixa: string) =>
    eleitoresBase.filter((e: any) => {
      const idade = calcularIdade(e.nascimento);
      if (idade === null) return false;
      if (faixa === 'ate17') return idade <= 17;
      if (faixa === 'de18a45') return idade >= 18 && idade <= 45;
      if (faixa === 'mais46') return idade >= 46;
      return false;
    });

  // Distribuição por faixa etária calculada do cache de eleitores
  // (0-17, 18-45 e 46+, além dos sem data de nascimento)
  const faixasEtarias = useMemo(() => {
    const grupos = { ate17: 0, de18a45: 0, mais46: 0, semInfo: 0 };

    eleitoresBase.forEach((e: any) => {
      const idade = calcularIdade(e.nascimento);
      if (idade === null) {
        grupos.semInfo++;
        return;
      }
      if (idade <= 17) grupos.ate17++;
      else if (idade <= 45) grupos.de18a45++;
      else grupos.mais46++;
    });

    return grupos;
  }, [eleitoresBase]);

  // Percentual de preenchimento dos campos — mostra onde faltam dados para a estratégia
  const coberturaCadastro = useMemo(() => {
    const total = eleitoresBase.length || 1;
    const pct = (condicao: (e: any) => boolean) =>
      Math.round((eleitoresBase.filter(condicao).length / total) * 100);
    return {
      whatsapp: pct(e => !!e.whatsapp),
      nascimento: pct(e => !!e.nascimento),
      zonaSecao: pct(e => !!e.zona && !!e.secao),
      indicado: pct(e => !!e.indicado_uid),
      genero: pct(e => !!e.genero),
      bairro: pct(e => !!e.bairro),
    };
  }, [eleitoresBase]);

  // Listas filtradas pela busca rápida de cada tabela
  const cidadesFiltradas = useMemo(
    () => filtrarLista(stats?.porCidade ?? [], buscaCidade, c => c.cidade),
    [stats, buscaCidade]
  );
  const logradourosFiltrados = useMemo(
    () => filtrarLista(
      stats?.porLogradouro ?? [],
      buscaLogradouro,
      l => `${l.logradouro} ${l.bairro} ${l.cidade}`
    ),
    [stats, buscaLogradouro]
  );

  const bairrosFiltrados = useMemo(
    () => filtrarLista(stats?.porBairro ?? [], buscaBairro, b => `${b.bairro} ${b.cidade}`),
    [stats, buscaBairro]
  );
  const indicadosFiltrados = useMemo(
    () => filtrarLista(stats?.porIndicado ?? [], buscaIndicado, i => i.indicado_nome),
    [stats, buscaIndicado]
  );
  const categoriasFiltradas = useMemo(
    () => filtrarLista(categorias, buscaCategoria, c => c.nome),
    [categorias, buscaCategoria]
  );
  const zonasFiltradas = useMemo(
    () => filtrarLista(stats?.porZonaSecao ?? [], buscaZona, z => `${z.zona} ${z.secao}`),
    [stats, buscaZona]
  );
  const usuariosFiltrados = useMemo(
    () => filtrarLista(stats?.porUsuario ?? [], buscaUsuario, u => u.usuario_nome),
    [stats, buscaUsuario]
  );
  // Quantidade de aniversariantes por dia do mês selecionado (mini gráfico)
  const aniversariantesPorDia = useMemo(() => {
    const porDia = aniversariantes.reduce((acc, e) => {
      const dia = Number(String(e.nascimento || '').split('-')[2]) || 0;
      if (dia > 0) acc[dia] = (acc[dia] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    return Object.entries(porDia)
      .map(([dia, total]) => ({ dia, total }))
      .sort((a, b) => Number(a.dia) - Number(b.dia));
  }, [aniversariantes]);
  // Dados do gráfico de Qualidade do Cadastro (% preenchido por campo)
  const camposQualidade = useMemo(() => [
    { campo: 'WhatsApp', pct: coberturaCadastro.whatsapp },
    { campo: 'Nascimento', pct: coberturaCadastro.nascimento },
    { campo: 'Zona + Seção', pct: coberturaCadastro.zonaSecao },
    { campo: 'Indicado', pct: coberturaCadastro.indicado },
    { campo: 'Gênero', pct: coberturaCadastro.genero },
    { campo: 'Bairro', pct: coberturaCadastro.bairro }
  ], [coberturaCadastro]);

  // Exibe o botão "voltar ao topo" após rolar a página
  useEffect(() => {
    const scroller = getPageScroller();
    const onScroll = () => setMostrarTopo(scroller.scrollTop > 400);
    scroller.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  // Rolagem suave até uma seção da barra de navegação rápida
  // (desconta a altura da barra fixa para a seção não ficar por baixo dela)
  const scrollParaSecao = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const scroller = getPageScroller();
    const topo =
      el.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop - 90;
    scroller.scrollTo({ top: topo, behavior: 'smooth' });
  };

  // Estados para paginação
  const [cidadePage, setCidadePage] = useState(1);
  const [indicadoPage, setIndicadoPage] = useState(1);
  const [bairroPage, setBairroPage] = useState(1);
  const [zonaPage, setZonaPage] = useState(1);
  const [usuarioPage, setUsuarioPage] = useState(1);
  const [confiabilidadePage, setConfiabilidadePage] = useState(1);
  const [topEleitoresPage, setTopEleitoresPage] = useState(1);
  const itemsPerPage = 10;
  const bairrosPerPage = 5;

  // Mapeamento de ícones para cada tipo de confiabilidade
  const confiabilidadeConfig = {
    'Frio': { icon: '🧊', description: 'Pouco engajado, dificilmente votará' },
    'Indeciso': { icon: '🤔', description: 'Ainda não definiu seu voto, precisa de convencimento' },
    'Morno': { icon: '🌥️', description: 'Demonstra interesse, mas não está totalmente convencido' },
    'Quente': { icon: '🔥', description: 'Alta chance de votar, mas ainda requer atenção' },
    'Convicto': { icon: '🏆', description: 'Já decidiu e apoia publicamente' },
    'Fiel': { icon: '✅', description: 'Já vota e defende a candidatura' },
    'Multiplicador': { icon: '🚀', description: 'Além de votar, influencia outras pessoas' },
  };

  useEffect(() => {
    if (!canAccess) {
      navigate('/app');
      return;
    }
    if (!company?.uid) return;

    // Uma única consulta traz todos os campos necessários de
    // gbp_eleitores; cada agregação reutiliza esse array em memória.
    // Antes a página baixava a tabela inteira ~8 vezes em paralelo.
    const loadAll = async () => {
      const { data: rows, error } = await supabaseClient
        .from('gbp_eleitores')
        .select(`
          uid,
          nome,
          nascimento,
          whatsapp,
          telefone,
          cidade,
          bairro,
          logradouro,
          numero,
          genero,
          zona,
          secao,
          confiabilidade_do_voto,
          usuario_uid,
          indicado_uid,
          categoria_uid,
          created_at,
          usuario:usuario_uid (uid, nome),
          indicado:indicado_uid (uid, nome),
          categoria:categoria_uid (uid, nome)
        `)
        .eq('empresa_uid', company.uid);

      if (error) {
        console.error('Erro ao carregar eleitores:', error);
        setLoading(false);
        return;
      }

      const eleitores = rows || [];
      setEleitoresBase(eleitores);

      loadStats(eleitores);
      loadCategorias(eleitores);
      loadCrescimento(eleitores);
      loadCrescimentoIndicados(eleitores);
      loadCrescimentoCategorias(eleitores);
      loadCrescimentoBairros(eleitores);
      loadCrescimentoZonasSecoes(eleitores);
      loadCrescimentoConfiabilidade(eleitores);
      loadCrescimentoUsuarios(eleitores);
    };

    loadAll();
  }, [company?.uid, canAccess]);

  // Carregar aniversariantes quando o mês mudar (usa o cache em memória,
  // sem nova consulta ao banco)
  useEffect(() => {
    if (company?.uid && selectedMonth && eleitoresBase.length > 0) {
      loadAniversariantes(eleitoresBase);
      setGeneroFilter('all'); // Resetar filtro ao mudar o mês
      setAniversariantesPage(1);
    }
  }, [company?.uid, selectedMonth, eleitoresBase]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.relative')) {
        setOpenMenuBairro(null);
        setOpenMenuCidade(null);
        setOpenMenuUsuario(null);
        setOpenMenuConfiabilidade(null);
        setOpenMenuIndicado(null);
        setOpenMenuZona(null);
        setOpenMenuAniversariante(false);
        setOpenMenuCategoria(null);
        setOpenMenuFaixa(null);
        setOpenMenuLogradouro(null);
      }
    };
    
    if (openMenuBairro || openMenuCidade || openMenuUsuario || openMenuConfiabilidade || openMenuIndicado || openMenuZona || openMenuAniversariante || openMenuCategoria || openMenuFaixa || openMenuLogradouro) {
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuBairro, openMenuCidade, openMenuUsuario, openMenuConfiabilidade, openMenuIndicado, openMenuZona, openMenuAniversariante, openMenuCategoria, openMenuFaixa, openMenuLogradouro]);

  const loadStats = async (rows?: any[]) => {
    if (!company?.uid) {
      // toast.error('Empresa não identificada');
      return;
    }

    try {
      setLoading(true);
      const data = await eleitorStatsService.getStats(company.uid, rows);
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      // toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const loadCrescimento = async (rows?: any[]) => {
    if (!company?.uid) return;

    try {
      setLoadingCrescimento(true);
      const data = await eleitorStatsService.getCrescimentoPorCidade(company.uid, rows);
      setCrescimentoCidades(data);
    } catch (error) {
      console.error('Erro ao carregar crescimento:', error);
    } finally {
      setLoadingCrescimento(false);
    }
  };

  const loadCrescimentoIndicados = async (rows?: any[]) => {
    if (!company?.uid) return;

    try {
      setLoadingCrescimentoIndicados(true);
      const data = await eleitorStatsService.getCrescimentoPorIndicado(company.uid, rows);
      setCrescimentoIndicados(data);
    } catch (error) {
      console.error('Erro ao carregar crescimento de indicados:', error);
    } finally {
      setLoadingCrescimentoIndicados(false);
    }
  };

  const loadCrescimentoCategorias = async (rows?: any[]) => {
    if (!company?.uid) return;

    try {
      setLoadingCrescimentoCategorias(true);
      const data = await eleitorStatsService.getCrescimentoPorCategoria(company.uid, rows);
      setCrescimentoCategorias(data);
    } catch (error) {
      console.error('Erro ao carregar crescimento de categorias:', error);
    } finally {
      setLoadingCrescimentoCategorias(false);
    }
  };

  const loadCrescimentoBairros = async (rows?: any[]) => {
    if (!company?.uid) return;

    try {
      setLoadingCrescimentoBairros(true);
      const data = await eleitorStatsService.getCrescimentoPorBairro(company.uid, rows);
      setCrescimentoBairros(data);
    } catch (error) {
      console.error('Erro ao carregar crescimento de bairros:', error);
    } finally {
      setLoadingCrescimentoBairros(false);
    }
  };

  const loadCrescimentoZonasSecoes = async (rows?: any[]) => {
    if (!company?.uid) return;

    try {
      setLoadingCrescimentoZonasSecoes(true);
      const data = await eleitorStatsService.getCrescimentoPorZonaSecao(company.uid, rows);
      setCrescimentoZonasSecoes(data);
    } catch (error) {
      console.error('Erro ao carregar crescimento de zonas e seções:', error);
    } finally {
      setLoadingCrescimentoZonasSecoes(false);
    }
  };

  const loadCrescimentoConfiabilidade = async (rows?: any[]) => {
    if (!company?.uid) return;

    try {
      setLoadingCrescimentoConfiabilidade(true);
      const data = await eleitorStatsService.getCrescimentoPorConfiabilidade(company.uid, rows);
      setCrescimentoConfiabilidade(data);
    } catch (error) {
      console.error('Erro ao carregar crescimento de confiabilidade:', error);
    } finally {
      setLoadingCrescimentoConfiabilidade(false);
    }
  };

  const loadCrescimentoUsuarios = async (rows?: any[]) => {
    if (!company?.uid) return;

    try {
      setLoadingCrescimentoUsuarios(true);
      const data = await eleitorStatsService.getCrescimentoPorUsuario(company.uid, rows);
      setCrescimentoUsuarios(data);
    } catch (error) {
      console.error('Erro ao carregar crescimento de usuários:', error);
    } finally {
      setLoadingCrescimentoUsuarios(false);
    }
  };

  const loadAniversariantes = async (rows?: any[]) => {
    if (!company?.uid || !selectedMonth) return;

    try {
      setLoadingAniversariantes(true);
      const [year, month] = selectedMonth.split('-');

      // Reutiliza os eleitores já carregados; só consulta o banco se
      // a lista ainda não estiver em memória
      let data = rows;
      if (!data) {
        const { data: fetched, error } = await supabaseClient
          .from('gbp_eleitores')
          .select('uid, nome, nascimento, whatsapp, telefone, cidade, bairro, genero')
          .eq('empresa_uid', company.uid)
          .not('nascimento', 'is', null)
          .order('nascimento');

        if (error) throw error;
        data = fetched;
      }

      // Filtrar por mês de nascimento (tratando timezone corretamente)
      const filtered = data?.filter((eleitor: any) => {
        if (!eleitor.nascimento) return false;
        // Criar data local sem conversão de timezone
        const [y, m, d] = eleitor.nascimento.split('-').map(Number);
        const birthDate = new Date(y, m - 1, d);
        return birthDate.getMonth() + 1 === parseInt(month);
      }) || [];

      // Ordenar por dia do mês
      filtered.sort((a, b) => {
        const [, , dayA] = a.nascimento.split('-').map(Number);
        const [, , dayB] = b.nascimento.split('-').map(Number);
        return dayA - dayB;
      });

      setAniversariantes(filtered);
    } catch (error) {
      console.error('Erro ao carregar aniversariantes:', error);
      setAniversariantes([]);
    } finally {
      setLoadingAniversariantes(false);
    }
  };

  const loadCategorias = async (rows?: any[]) => {
    if (!company?.uid) return;

    try {
      setLoadingCategorias(true);
      
      // Buscar todas as categorias com seus tipos
      const { data, error } = await supabaseClient
        .from('gbp_categorias')
        .select(`
          uid,
          nome,
          tipo:gbp_categoria_tipos!gbp_categorias_tipo_uid_fkey(nome)
        `)
        .eq('empresa_uid', company.uid)
        .order('nome');

      if (error) throw error;

      // Contagem de eleitores por categoria feita em memória a partir
      // dos dados já carregados (evita 1 query COUNT por categoria)
      let fonte = rows;
      if (!fonte) {
        const { data: eleitoresCategoria } = await supabaseClient
          .from('gbp_eleitores')
          .select('categoria_uid')
          .eq('empresa_uid', company.uid);
        fonte = eleitoresCategoria || [];
      }

      const contagem = new Map<string, number>();
      fonte.forEach((e: any) => {
        if (e.categoria_uid) {
          contagem.set(e.categoria_uid, (contagem.get(e.categoria_uid) || 0) + 1);
        }
      });

      const categoriasComContagem = (data || []).map((cat: any) => ({
        categoria_uid: cat.uid,
        nome: cat.nome,
        tipo: cat.tipo?.nome || null,
        total: contagem.get(cat.uid) || 0
      }));

      // Ordenar por quantidade (maior para menor)
      categoriasComContagem.sort((a, b) => b.total - a.total);
      
      setCategorias(categoriasComContagem);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setCategorias([]);
    } finally {
      setLoadingCategorias(false);
    }
  };

  // Exportar eleitores de uma categoria específica para Excel
  const exportarCategoriaExcel = async (categoriaUid: string, categoriaNome: string) => {
    if (!company?.uid) return;

    try {
      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .eq('categoria_uid', categoriaUid)
        .order('nome');

      if (error) throw error;

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(categoriaNome);
      
      sheet.columns = [
        { header: 'Nome', key: 'nome', width: 30 },
        { header: 'CPF', key: 'cpf', width: 18 },
        { header: 'RG/CNH', key: 'ax_rg_cnh', width: 18 },
        { header: 'Data Nascimento', key: 'nascimento', width: 18 },
        { header: 'Nome da Mãe', key: 'nome_mae', width: 30 },
        { header: 'Gênero', key: 'genero', width: 12 },
        { header: 'WhatsApp', key: 'whatsapp', width: 20 },
        { header: 'Telefone', key: 'telefone', width: 20 },
        { header: 'Instagram', key: 'instagram', width: 25 },
        { header: 'CEP', key: 'cep', width: 12 },
        { header: 'Logradouro', key: 'logradouro', width: 35 },
        { header: 'Número', key: 'numero', width: 10 },
        { header: 'Complemento', key: 'complemento', width: 20 },
        { header: 'Bairro', key: 'bairro', width: 25 },
        { header: 'Cidade', key: 'cidade', width: 25 },
        { header: 'UF', key: 'uf', width: 8 },
        { header: 'Título Eleitor', key: 'titulo', width: 18 },
        { header: 'Zona', key: 'zona', width: 10 },
        { header: 'Seção', key: 'secao', width: 10 },
        { header: 'Colégio Eleitoral', key: 'colegio_eleitoral', width: 30 },
        { header: 'Número SUS', key: 'numero_do_sus', width: 20 },
        { header: 'Confiabilidade', key: 'confiabilidade_do_voto', width: 18 },
        { header: 'Responsável', key: 'responsavel', width: 25 },
        { header: 'Resp. pelo Eleitor', key: 'responsavel_pelo_eleitor', width: 25 },
        { header: 'Qtd Adultos Residência', key: 'quantidade_adultos_residencia', width: 20 }
      ];

      (data || []).forEach(eleitor => {
        sheet.addRow({
          nome: eleitor.nome || '',
          cpf: eleitor.cpf || '',
          ax_rg_cnh: eleitor.ax_rg_cnh || '',
          nascimento: eleitor.nascimento ? new Date(eleitor.nascimento).toLocaleDateString('pt-BR') : '',
          nome_mae: eleitor.nome_mae || '',
          genero: eleitor.genero || '',
          whatsapp: eleitor.whatsapp || '',
          telefone: eleitor.telefone || '',
          instagram: eleitor.instagram || '',
          cep: eleitor.cep || '',
          logradouro: eleitor.logradouro || '',
          numero: eleitor.numero || '',
          complemento: eleitor.complemento || '',
          bairro: eleitor.bairro || '',
          cidade: eleitor.cidade || '',
          uf: eleitor.uf || '',
          titulo: eleitor.titulo || '',
          zona: eleitor.zona || '',
          secao: eleitor.secao || '',
          colegio_eleitoral: eleitor.colegio_eleitoral || '',
          numero_do_sus: eleitor.numero_do_sus || '',
          confiabilidade_do_voto: eleitor.confiabilidade_do_voto || '',
          responsavel: eleitor.responsavel || '',
          responsavel_pelo_eleitor: eleitor.responsavel_pelo_eleitor || '',
          quantidade_adultos_residencia: eleitor.quantidade_adultos_residencia || ''
        });
      });

      // Estilizar cabeçalho
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' }
      };
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `categoria_${categoriaNome.replace(/\s+/g, '_')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar categoria:', error);
    }
  };

  // Exportar eleitores de uma categoria específica para PDF
  const exportarCategoriaPDF = async (categoriaUid: string, categoriaNome: string) => {
    if (!company?.uid) return;

    try {
      // Buscar tipo da categoria
      const categoria = categorias.find(c => c.categoria_uid === categoriaUid);
      const categoriaTipo = categoria?.tipo || 'Não informado';

      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('nome, whatsapp, cidade, bairro')
        .eq('empresa_uid', company.uid)
        .eq('categoria_uid', categoriaUid)
        .order('nome');

      if (error) throw error;

      const doc = new jsPDF();
      
      // Categoria (título principal)
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`Categoria: ${categoriaNome}`, 14, 15);
      
      // Nome da Empresa (lado direito, menor)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100); // Cinza
      doc.text('GBP Politico', 196, 15, { align: 'right' });
      
      // Linha divisória
      doc.setDrawColor(59, 130, 246); // Azul
      doc.setLineWidth(0.5);
      doc.line(14, 18, 196, 18);
      
      // Tipo da Categoria
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100); // Cinza
      doc.text(`Tipo: ${categoriaTipo}`, 14, 24);
      
      // Total
      doc.setTextColor(0, 0, 0); // Voltar para preto
      doc.text(`Total: ${data?.length || 0} eleitores`, 14, 30);

      (doc as any).autoTable({
        head: [['Nome', 'WhatsApp', 'Cidade', 'Bairro']],
        body: (data || []).map(eleitor => [
          eleitor.nome || '',
          eleitor.whatsapp || '',
          eleitor.cidade || '',
          eleitor.bairro || ''
        ]),
        startY: 36,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: {
          0: { cellWidth: 60 }, // Nome
          1: { cellWidth: 40 }, // WhatsApp
          2: { cellWidth: 40 }, // Cidade
          3: { cellWidth: 42 }  // Bairro
        }
      });

      doc.save(`categoria_${categoriaNome.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar categoria PDF:', error);
    }
  };

  const handleExportExcel = async () => {
    if (!stats) return;

    // Log dos dados que serão exportados
    console.log('Dados para exportação:', {
      totalEleitores: stats.totalEleitores,
      cidades: stats.porCidade,
      bairros: stats.porBairro,
      zonas: stats.porZonaSecao,
      indicados: stats.porIndicado,
      usuarios: stats.porUsuario
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Eleitoral';
    workbook.created = new Date();

    try {
      // 1. Aba de Cidades
      console.log('Criando aba de Cidades...');
      const cidadesSheet = workbook.addWorksheet('Cidades');
      cidadesSheet.columns = [
        { header: 'Cidade', key: 'cidade', width: 30 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: 'Porcentagem', key: 'porcentagem', width: 15 }
      ];

      // Verificar se há dados de cidades
      if (stats.porCidade.length === 0) {
        console.warn('Nenhum dado de cidade encontrado');
      }

      // Adicionar todas as cidades
      stats.porCidade.forEach((cidade, index) => {
        console.log(`Adicionando cidade ${index + 1}/${stats.porCidade.length}:`, cidade);
        cidadesSheet.addRow({
          cidade: cidade.cidade,
          total: cidade.total,
          porcentagem: `${((cidade.total / stats.totalEleitores) * 100).toFixed(1)}%`
        });
      });

      // 2. Aba de Indicados
      console.log('Criando aba de Indicados...');
      const indicadosSheet = workbook.addWorksheet('Indicados');
      indicadosSheet.columns = [
        { header: 'Indicado', key: 'indicado', width: 30 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: 'Porcentagem', key: 'porcentagem', width: 15 }
      ];

      // Verificar se há dados de indicados
      if (stats.porIndicado.length === 0) {
        console.warn('Nenhum dado de indicado encontrado');
      }

      // Adicionar todos os indicados
      stats.porIndicado.forEach((indicado, index) => {
        console.log(`Adicionando indicado ${index + 1}/${stats.porIndicado.length}:`, indicado);
        indicadosSheet.addRow({
          indicado: indicado.indicado_nome,
          total: indicado.total,
          porcentagem: `${((indicado.total / stats.totalEleitores) * 100).toFixed(1)}%`
        });
      });

      // 3. Aba de Bairros
      console.log('Criando aba de Bairros...');
      const bairrosSheet = workbook.addWorksheet('Bairros por Cidade');
      bairrosSheet.columns = [
        { header: 'Cidade', key: 'cidade', width: 30 },
        { header: 'Bairro', key: 'bairro', width: 30 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: '% do Total', key: 'porcentagemTotal', width: 15 },
        { header: '% da Cidade', key: 'porcentagemCidade', width: 15 }
      ];

      // Verificar se há dados de bairros
      if (stats.porBairro.length === 0) {
        console.warn('Nenhum dado de bairro encontrado');
      }

      // Agrupar bairros por cidade
      const bairrosPorCidade = stats.porBairro.reduce((acc, curr) => {
        if (!acc[curr.cidade]) {
          acc[curr.cidade] = [];
        }
        acc[curr.cidade].push(curr);
        return acc;
      }, {} as Record<string, typeof stats.porBairro>);

      console.log('Bairros agrupados por cidade:', bairrosPorCidade);

      // Adicionar todos os bairros agrupados por cidade
      Object.entries(bairrosPorCidade).forEach(([cidade, bairros], cidadeIndex) => {
        console.log(`Processando cidade ${cidadeIndex + 1}: ${cidade} com ${bairros.length} bairros`);
        
        const cidadeTotal = bairros.reduce((sum, b) => sum + b.total, 0);
        
        // Adicionar linha da cidade
        bairrosSheet.addRow({
          cidade: cidade,
          bairro: 'TOTAL DA CIDADE',
          total: cidadeTotal,
          porcentagemTotal: `${((cidadeTotal / stats.totalEleitores) * 100).toFixed(1)}%`,
          porcentagemCidade: '100%'
        });

        // Adicionar todos os bairros da cidade
        bairros.forEach((bairro, bairroIndex) => {
          console.log(`Adicionando bairro ${bairroIndex + 1}/${bairros.length} da cidade ${cidade}:`, bairro);
          bairrosSheet.addRow({
            cidade: '',
            bairro: bairro.bairro,
            total: bairro.total,
            porcentagemTotal: `${((bairro.total / stats.totalEleitores) * 100).toFixed(1)}%`,
            porcentagemCidade: `${((bairro.total / cidadeTotal) * 100).toFixed(1)}%`
          });
        });

        bairrosSheet.addRow({}); // Linha em branco entre cidades
      });

      // 3b. Aba de Logradouros
      console.log('Criando aba de Logradouros...');
      const logradourosSheet = workbook.addWorksheet('Logradouros');
      logradourosSheet.columns = [
        { header: 'Logradouro', key: 'logradouro', width: 35 },
        { header: 'Bairro', key: 'bairro', width: 25 },
        { header: 'Cidade', key: 'cidade', width: 25 },
        { header: 'Eleitores', key: 'total', width: 12 },
        { header: 'Atendimentos', key: 'atendimentos', width: 15 },
        { header: '% do Total', key: 'porcentagemTotal', width: 15 }
      ];

      stats.porLogradouro?.forEach(grupo => {
        const totalAtendimentos = grupo.eleitores.reduce(
          (sum, e) => sum + (stats.atendimentosPorEleitor?.[e.uid]?.length || 0), 0
        );
        logradourosSheet.addRow({
          logradouro: grupo.logradouro,
          bairro: grupo.bairro,
          cidade: grupo.cidade,
          total: grupo.total,
          atendimentos: totalAtendimentos,
          porcentagemTotal: `${((grupo.total / stats.totalEleitores) * 100).toFixed(1)}%`
        });
      });

      // 4. Aba de Zonas e Seções
      console.log('Criando aba de Zonas e Seções...');
      const zonasSheet = workbook.addWorksheet('Zonas e Seções');
      zonasSheet.columns = [
        { header: 'Zona', key: 'zona', width: 15 },
        { header: 'Seção', key: 'secao', width: 15 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: 'Porcentagem', key: 'porcentagem', width: 15 }
      ];

      // Verificar se há dados de zonas
      if (stats.porZonaSecao.length === 0) {
        console.warn('Nenhum dado de zona/seção encontrado');
      }

      // Adicionar todas as zonas e seções
      stats.porZonaSecao.forEach((zona, index) => {
        console.log(`Adicionando zona/seção ${index + 1}/${stats.porZonaSecao.length}:`, zona);
        zonasSheet.addRow({
          zona: zona.zona,
          secao: zona.secao,
          total: zona.total,
          porcentagem: `${((zona.total / stats.totalEleitores) * 100).toFixed(1)}%`
        });
      });

      // 5. Aba de Usuários
      console.log('Criando aba de Usuários...');
      const usuariosSheet = workbook.addWorksheet('Usuários');
      usuariosSheet.columns = [
        { header: 'Usuário', key: 'nome', width: 30 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: 'Porcentagem', key: 'porcentagem', width: 15 },
      ];

      stats.porUsuario.forEach((usuario) => {
        const porcentagem = (usuario.total / stats.totalEleitores) * 100;
        usuariosSheet.addRow({
          nome: usuario.usuario_nome,
          total: usuario.total,
          porcentagem: `${porcentagem.toFixed(1)}%`,
        });
      });

      // Adiciona aba de Confiabilidade do Voto
      const confiabilidadeSheet = workbook.addWorksheet('Confiabilidade do Voto');
      confiabilidadeSheet.columns = [
        { header: 'Nível', key: 'nivel', width: 30 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: 'Porcentagem', key: 'porcentagem', width: 15 },
      ];

      stats.porConfiabilidade.forEach((conf) => {
        confiabilidadeSheet.addRow({
          nivel: conf.confiabilidade,
          total: conf.total,
          porcentagem: `${((conf.total / stats.totalEleitores) * 100).toFixed(1)}%`,
        });
      });

      // Adiciona aba de Top 20 Eleitores
      const topEleitoresSheet = workbook.addWorksheet('Top 20 Eleitores');
      topEleitoresSheet.columns = [
        { header: 'Eleitor', key: 'nome', width: 30 },
        { header: 'WhatsApp', key: 'whatsapp', width: 15 },
        { header: 'Total Atendimentos', key: 'total', width: 20 },
      ];

      stats.topEleitoresAtendimentos.forEach((eleitor) => {
        topEleitoresSheet.addRow({
          nome: eleitor.eleitor_nome,
          whatsapp: eleitor.whatsapp,
          total: eleitor.total_atendimentos,
        });
      });

      // Aba de Categorias
      const categoriasSheet = workbook.addWorksheet('Categorias');
      categoriasSheet.columns = [
        { header: 'Categoria', key: 'nome', width: 30 },
        { header: 'Tipo', key: 'tipo', width: 20 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: 'Porcentagem', key: 'porcentagem', width: 15 },
      ];

      categorias.forEach((categoria) => {
        categoriasSheet.addRow({
          nome: categoria.nome,
          tipo: categoria.tipo || 'Não informado',
          total: categoria.total,
          porcentagem: `${((categoria.total / stats.totalEleitores) * 100).toFixed(1)}%`,
        });
      });

      // Aba de Faixa Etária
      const faixaEtariaSheet = workbook.addWorksheet('Faixa Etária');
      faixaEtariaSheet.columns = [
        { header: 'Faixa Etária', key: 'faixa', width: 25 },
        { header: 'Quantidade', key: 'total', width: 15 },
        { header: 'Porcentagem', key: 'porcentagem', width: 15 },
      ];

      const totalComNascimento = stats.totalEleitores - faixasEtarias.semInfo;
      [
        { faixa: '0 a 17 anos', total: faixasEtarias.ate17 },
        { faixa: '18 a 45 anos', total: faixasEtarias.de18a45 },
        { faixa: '46 anos ou mais', total: faixasEtarias.mais46 },
      ].forEach((item) => {
        faixaEtariaSheet.addRow({
          faixa: item.faixa,
          total: item.total,
          porcentagem: totalComNascimento > 0
            ? `${((item.total / totalComNascimento) * 100).toFixed(1)}%`
            : '0%',
        });
      });

      if (faixasEtarias.semInfo > 0) {
        faixaEtariaSheet.addRow({
          faixa: 'Sem data de nascimento',
          total: faixasEtarias.semInfo,
          porcentagem: `${((faixasEtarias.semInfo / stats.totalEleitores) * 100).toFixed(1)}%`,
        });
      }

      // Aba de Qualidade do Cadastro (percentual de campos preenchidos)
      const qualidadeSheet = workbook.addWorksheet('Qualidade do Cadastro');
      qualidadeSheet.columns = [
        { header: 'Campo', key: 'campo', width: 25 },
        { header: 'Preenchidos', key: 'preenchidos', width: 15 },
        { header: 'Faltando', key: 'faltando', width: 15 },
        { header: '% Preenchido', key: 'porcentagem', width: 15 },
      ];

      [
        { campo: 'WhatsApp', pct: coberturaCadastro.whatsapp },
        { campo: 'Nascimento', pct: coberturaCadastro.nascimento },
        { campo: 'Zona + Seção', pct: coberturaCadastro.zonaSecao },
        { campo: 'Indicado', pct: coberturaCadastro.indicado },
        { campo: 'Gênero', pct: coberturaCadastro.genero },
        { campo: 'Bairro', pct: coberturaCadastro.bairro },
      ].forEach((item) => {
        const preenchidos = Math.round((item.pct / 100) * stats.totalEleitores);
        qualidadeSheet.addRow({
          campo: item.campo,
          preenchidos,
          faltando: stats.totalEleitores - preenchidos,
          porcentagem: `${item.pct}%`,
        });
      });

      // Aba de Aniversariantes (mês selecionado na seção)
      const aniversariantesSheet = workbook.addWorksheet('Aniversariantes');
      aniversariantesSheet.columns = [
        { header: 'Nome', key: 'nome', width: 35 },
        { header: 'Dia', key: 'dia', width: 10 },
        { header: 'WhatsApp', key: 'whatsapp', width: 20 },
        { header: 'Cidade', key: 'cidade', width: 25 },
        { header: 'Bairro', key: 'bairro', width: 25 },
      ];

      aniversariantes.forEach((eleitor: any) => {
        const [, , dia] = String(eleitor.nascimento || '').split('-').map(Number);
        aniversariantesSheet.addRow({
          nome: eleitor.nome || '',
          dia: dia || '',
          whatsapp: eleitor.whatsapp || eleitor.telefone || '',
          cidade: eleitor.cidade || '',
          bairro: eleitor.bairro || '',
        });
      });

      // Aplicar estilos a todas as abas
      [cidadesSheet, indicadosSheet, bairrosSheet, zonasSheet, usuariosSheet, confiabilidadeSheet, topEleitoresSheet, categoriasSheet, faixaEtariaSheet, qualidadeSheet, aniversariantesSheet].forEach(sheet => {
        // Estilo para o cabeçalho
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F0FF' }
        };

        // Aplicar estilos a todas as células
        sheet.eachRow((row) => {
          row.eachCell(cell => {
            // Bordas
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };

            // Alinhamento
            if (typeof cell.value === 'number') {
              cell.alignment = { horizontal: 'right' };
            }
          });

          // Destacar totais
          if (
            row.getCell(1).value === 'Total Geral' || 
            row.getCell(2).value === 'TOTAL DA CIDADE'
          ) {
            row.eachCell(cell => {
              cell.font = { bold: true };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF0F0F0' }
              };
            });
          }
        });

        // Congelar cabeçalho
        sheet.views = [
          { state: 'frozen', xSplit: 0, ySplit: 1 }
        ];
      });

      console.log('Gerando arquivo Excel...');
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Relatório_Eleitores_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      console.log('Arquivo Excel gerado com sucesso!');

    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      alert('Erro ao gerar o arquivo Excel. Por favor, tente novamente.');
    }
  };

  // Funções auxiliares para paginação
  const getPaginatedData = <T extends any>(data: T[], page: number, perPage: number = itemsPerPage): T[] => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return data.slice(start, end);
  };

  // Função para atualizar a página de uma cidade específica
  const handleBairroPageChange = (cidade: string, page: number) => {
    setBairroPages(prev => ({
      ...prev,
      [cidade]: page
    }));
  };

  // Função para obter a página atual dos bairros de uma cidade
  const getBairroPage = (cidade: string) => bairroPages[cidade] || 1;

  // Função auxiliar para definir colunas completas do Excel
  const getExcelColumns = () => [
    { header: 'Nome', key: 'nome', width: 30 },
    { header: 'CPF', key: 'cpf', width: 15 },
    { header: 'Nascimento', key: 'nascimento', width: 12 },
    { header: 'WhatsApp', key: 'whatsapp', width: 15 },
    { header: 'Telefone', key: 'telefone', width: 15 },
    { header: 'Gênero', key: 'genero', width: 12 },
    { header: 'Título', key: 'titulo', width: 15 },
    { header: 'Zona', key: 'zona', width: 10 },
    { header: 'Seção', key: 'secao', width: 10 },
    { header: 'CEP', key: 'cep', width: 12 },
    { header: 'Logradouro', key: 'logradouro', width: 35 },
    { header: 'Número', key: 'numero', width: 10 },
    { header: 'Complemento', key: 'complemento', width: 20 },
    { header: 'Bairro', key: 'bairro', width: 20 },
    { header: 'Cidade', key: 'cidade', width: 20 },
    { header: 'UF', key: 'uf', width: 5 },
    { header: 'Nome da Mãe', key: 'nome_mae', width: 30 },
    { header: 'Instagram', key: 'instagram', width: 20 },
    { header: 'Número do SUS', key: 'numero_do_sus', width: 18 },
    { header: 'Responsável pelo Eleitor', key: 'responsavel_pelo_eleitor', width: 25 },
    { header: 'Confiabilidade do Voto', key: 'confiabilidade_do_voto', width: 20 },
    { header: 'Colégio Eleitoral', key: 'colegio_eleitoral', width: 25 },
    { header: 'Qtd Adultos Residência', key: 'quantidade_adultos_residencia', width: 20 }
  ];

  // Função auxiliar para formatar dados do eleitor para Excel
  const formatEleitorForExcel = (eleitor: any) => ({
    nome: eleitor.nome || '',
    cpf: eleitor.cpf || '',
    nascimento: eleitor.nascimento ? new Date(eleitor.nascimento).toLocaleDateString('pt-BR') : '',
    whatsapp: eleitor.whatsapp || '',
    telefone: eleitor.telefone || '',
    genero: eleitor.genero || '',
    titulo: eleitor.titulo || '',
    zona: eleitor.zona || '',
    secao: eleitor.secao || '',
    cep: eleitor.cep || '',
    logradouro: eleitor.logradouro || '',
    numero: eleitor.numero || '',
    complemento: eleitor.complemento || '',
    bairro: eleitor.bairro || '',
    cidade: eleitor.cidade || '',
    uf: eleitor.uf || '',
    nome_mae: eleitor.nome_mae || '',
    instagram: eleitor.instagram || '',
    numero_do_sus: eleitor.numero_do_sus || '',
    responsavel_pelo_eleitor: eleitor.responsavel_pelo_eleitor || '',
    confiabilidade_do_voto: eleitor.confiabilidade_do_voto || '',
    colegio_eleitoral: eleitor.colegio_eleitoral || '',
    quantidade_adultos_residencia: eleitor.quantidade_adultos_residencia || ''
  });

  // Exportar eleitores de uma faixa etária para Excel
  const handleExportFaixaExcel = async (faixa: string, faixaLabel: string) => {
    if (!company?.uid) return;

    try {
      // UIDs dos eleitores da faixa (calculados a partir do cache)
      const uids = new Set(filtrarPorFaixaEtaria(faixa).map((e: any) => e.uid));
      if (uids.size === 0) {
        alert('Nenhuma pessoa cadastrada nesta faixa etária.');
        return;
      }

      // Buscar dados completos e filtrar pela faixa
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .order('nome');

      if (error) throw error;

      const filtrados = (eleitores || []).filter((e: any) => uids.has(e.uid));

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(faixaLabel);
      sheet.columns = getExcelColumns();

      filtrados.forEach((eleitor: any) => {
        sheet.addRow(formatEleitorForExcel(eleitor));
      });

      // Estilizar cabeçalho
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' }
      };
      sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `faixa_etaria_${faixaLabel.replace(/\s+/g, '_')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar faixa etária:', error);
      alert('Erro ao gerar o arquivo Excel.');
    }
  };

  // Exportar eleitores de uma faixa etária para PDF
  const handleExportFaixaPDF = async (faixa: string, faixaLabel: string) => {
    if (!company?.uid) return;

    try {
      const filtrados = filtrarPorFaixaEtaria(faixa)
        .slice()
        .sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || ''));

      if (filtrados.length === 0) {
        alert('Nenhuma pessoa cadastrada nesta faixa etária.');
        return;
      }

      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`Faixa Etária: ${faixaLabel}`, 14, 15);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('GBP Politico', 196, 15, { align: 'right' });

      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(14, 18, 196, 18);

      doc.setTextColor(0, 0, 0);
      doc.text(`Total: ${filtrados.length} eleitores`, 14, 26);

      (doc as any).autoTable({
        head: [['Nome', 'Idade', 'WhatsApp', 'Cidade', 'Bairro']],
        body: filtrados.map((eleitor: any) => [
          eleitor.nome || '',
          String(calcularIdade(eleitor.nascimento) ?? ''),
          eleitor.whatsapp || '',
          eleitor.cidade || '',
          eleitor.bairro || ''
        ]),
        startY: 32,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 15 },
          2: { cellWidth: 40 },
          3: { cellWidth: 40 },
          4: { cellWidth: 42 }
        }
      });

      doc.save(`faixa_etaria_${faixaLabel.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar faixa etária PDF:', error);
      alert('Erro ao gerar o arquivo PDF.');
    }
  };

  // Função para exportar eleitores de um bairro específico para Excel
  const handleExportBairroExcel = async (cidade: string, bairro: string) => {
    if (!company?.uid) return;

    try {
      // Buscar eleitores e filtrar em memória com normalização
      // (une variações de acento, maiúsculas e espaços — mesmo critério da tela)
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .order('nome');

      if (error) throw error;

      const cidadeNorm = normalizarBusca(cidade);
      const bairroNorm = normalizarBusca(bairro);
      const filtrados = (eleitores || []).filter(e =>
        normalizarBusca(e.cidade || '') === cidadeNorm &&
        normalizarBusca(e.bairro || '') === bairroNorm
      );

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(`${bairro} - ${cidade}`);

      sheet.columns = getExcelColumns();

      filtrados.forEach(eleitor => {
        sheet.addRow(formatEleitorForExcel(eleitor));
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eleitores_${bairro}_${cidade}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar bairro:', error);
      alert('Erro ao gerar o arquivo Excel');
    }
  };

  // Função para exportar eleitores de um logradouro específico para Excel
  const handleExportLogradouroExcel = async (logradouro: string, bairro: string, cidade: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .order('nome');

      if (error) throw error;

      // Filtra por logradouro+bairro+cidade ignorando acentos, maiúsculas e espaços
      const logradouroNorm = normalizarBusca(logradouro);
      const bairroNorm = normalizarBusca(bairro);
      const cidadeNorm = normalizarBusca(cidade);
      const filtrados = (eleitores || []).filter(e =>
        normalizarBusca(e.logradouro || '') === logradouroNorm &&
        normalizarBusca(e.bairro || '') === bairroNorm &&
        normalizarBusca(e.cidade || '') === cidadeNorm
      );

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(
        `${logradouro} - ${bairro}`.replace(/[\\/*?:[\]]/g, '').slice(0, 31)
      );

      sheet.columns = [
        ...getExcelColumns(),
        { header: 'Qtd Atendimentos', key: 'atendimentos', width: 16 }
      ];
      sheet.autoFilter = 'A1:W1';

      // Segunda aba: detalhes dos atendimentos de cada eleitor
      // (criada primeiro para mapear a linha inicial de cada eleitor e
      //  permitir link na coluna "Qtd Atendimentos" da aba principal)
      const atendimentosSheet = workbook.addWorksheet('Atendimentos');
      atendimentosSheet.columns = [
        { header: 'Eleitor', key: 'eleitor', width: 35 },
        { header: 'Data', key: 'data', width: 12 },
        { header: 'Tipo', key: 'tipo', width: 22 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Descrição', key: 'descricao', width: 55 }
      ];
      atendimentosSheet.autoFilter = 'A1:E1';

      const linhaInicialAtendimento: Record<string, number> = {};
      filtrados.forEach(eleitor => {
        const atendimentos = stats?.atendimentosPorEleitor?.[eleitor.uid] || [];
        if (atendimentos.length > 0) {
          linhaInicialAtendimento[eleitor.uid] = atendimentosSheet.rowCount + 1;
        }
        atendimentos.forEach(at => {
          atendimentosSheet.addRow({
            eleitor: eleitor.nome || '',
            data: at.data_atendimento ? new Date(at.data_atendimento).toLocaleDateString('pt-BR') : '',
            tipo: at.tipo_de_atendimento || '',
            status: at.status || '',
            descricao: at.descricao || ''
          });
        });
      });

      filtrados.forEach(eleitor => {
        const qtdAtendimentos = stats?.atendimentosPorEleitor?.[eleitor.uid]?.length || 0;
        const linha = linhaInicialAtendimento[eleitor.uid];
        const row = sheet.addRow({
          ...formatEleitorForExcel(eleitor),
          atendimentos: qtdAtendimentos
        });
        // Link interno: clicar na quantidade leva direto aos atendimentos do eleitor
        if (qtdAtendimentos > 0 && linha) {
          const cell = row.getCell('atendimentos');
          cell.value = {
            text: String(qtdAtendimentos),
            hyperlink: `#'Atendimentos'!A${linha}`
          } as any;
          cell.font = { color: { argb: 'FF0563C1' }, underline: true };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eleitores_${logradouro}_${bairro}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar logradouro:', error);
      alert('Erro ao gerar o arquivo Excel');
    }
  };

  // Função para exportar eleitores de um logradouro específico para PDF
  const handleExportLogradouroPDF = (grupo: { logradouro: string; bairro: string; cidade: string; total: number; eleitores: { uid: string; nome: string; numero: string | null; whatsapp: string | null }[] }) => {
    try {
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text(`Eleitores - ${grupo.logradouro}`, 14, 15);
      doc.setFontSize(12);
      doc.text(`${grupo.bairro} - ${grupo.cidade}`, 14, 22);
      doc.setFontSize(10);
      doc.text(`Total: ${grupo.total} eleitores`, 14, 28);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 33);

      (doc as any).autoTable({
        startY: 38,
        head: [['Nome', 'Nº', 'Telefone', 'Atendimentos']],
        body: grupo.eleitores.map(e => [
          e.nome || '',
          e.numero || '',
          e.whatsapp || '',
          String(stats?.atendimentosPorEleitor?.[e.uid]?.length || 0)
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      // Segunda tabela: detalhes dos atendimentos de cada eleitor
      const linhasAtendimentos = grupo.eleitores.flatMap(e =>
        (stats?.atendimentosPorEleitor?.[e.uid] || []).map(at => [
          e.nome || '',
          at.data_atendimento ? new Date(at.data_atendimento).toLocaleDateString('pt-BR') : '',
          at.tipo_de_atendimento || '',
          at.status || '',
          at.descricao || ''
        ])
      );

      if (linhasAtendimentos.length > 0) {
        const y = (doc as any).lastAutoTable.finalY + 8;
        doc.setFontSize(12);
        doc.text('Atendimentos realizados', 14, y);
        (doc as any).autoTable({
          startY: y + 3,
          head: [['Eleitor', 'Data', 'Tipo', 'Status', 'Descrição']],
          body: linhasAtendimentos,
          styles: { fontSize: 7 },
          headStyles: { fillColor: [139, 92, 246] }
        });
      }

      doc.save(`eleitores_${grupo.logradouro}_${grupo.bairro}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar logradouro PDF:', error);
      alert('Erro ao gerar o arquivo PDF');
    }
  };

  // Função para exportar eleitores de uma cidade específica para Excel
  const handleExportCidadeExcel = async (cidade: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .order('nome');

      if (error) throw error;

      // Filtra por cidade ignorando acentos, maiúsculas e espaços (mesmo critério da tela)
      const cidadeNorm = normalizarBusca(cidade);
      const filtrados = (eleitores || [])
        .filter(e => normalizarBusca(e.cidade || '') === cidadeNorm)
        .sort((a, b) =>
          (a.bairro || '').localeCompare(b.bairro || '') ||
          (a.nome || '').localeCompare(b.nome || '')
        );

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(cidade);

      sheet.columns = getExcelColumns();

      filtrados.forEach(eleitor => {
        sheet.addRow(formatEleitorForExcel(eleitor));
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eleitores_${cidade}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar cidade:', error);
      alert('Erro ao gerar o arquivo Excel');
    }
  };

  // Função para exportar eleitores de uma cidade específica para PDF
  const handleExportCidadePDF = async (cidade: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .order('nome');

      if (error) throw error;

      // Filtra por cidade ignorando acentos, maiúsculas e espaços (mesmo critério da tela)
      const cidadeNorm = normalizarBusca(cidade);
      const filtrados = (eleitores || [])
        .filter(e => normalizarBusca(e.cidade || '') === cidadeNorm)
        .sort((a, b) =>
          (a.bairro || '').localeCompare(b.bairro || '') ||
          (a.nome || '').localeCompare(b.nome || '')
        );

      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(`Eleitores - ${cidade}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Total: ${filtrados.length} eleitores`, 14, 22);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 27);

      (doc as any).autoTable({
        startY: 32,
        head: [['Nome', 'Bairro', 'Telefone', 'Zona/Seção']],
        body: filtrados.map(e => [
          e.nome || '',
          e.bairro || '',
          e.whatsapp || e.telefone || '',
          `${e.zona || ''}/${e.secao || ''}`
        ]) || [],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`eleitores_${cidade}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar cidade PDF:', error);
      alert('Erro ao gerar o arquivo PDF');
    }
  };

  // Função para exportar eleitores de um usuário específico para Excel
  const handleExportUsuarioExcel = async (usuarioNome: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*, gbp_usuarios!inner(nome)')
        .eq('empresa_uid', company.uid)
        .eq('gbp_usuarios.nome', usuarioNome)
        .order('cidade')
        .order('nome');

      if (error) throw error;

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(usuarioNome);

      sheet.columns = getExcelColumns();

      eleitores?.forEach(eleitor => {
        sheet.addRow(formatEleitorForExcel(eleitor));
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eleitores_${usuarioNome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar usuário:', error);
      alert('Erro ao gerar o arquivo Excel');
    }
  };

  // Função para exportar eleitores de um usuário específico para PDF
  const handleExportUsuarioPDF = async (usuarioNome: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*, gbp_usuarios!inner(nome)')
        .eq('empresa_uid', company.uid)
        .eq('gbp_usuarios.nome', usuarioNome)
        .order('cidade')
        .order('nome');

      if (error) throw error;

      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(`Cadastros - ${usuarioNome}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Total: ${eleitores?.length || 0} eleitores`, 14, 22);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 27);

      (doc as any).autoTable({
        startY: 32,
        head: [['Nome', 'Cidade', 'Bairro', 'Telefone']],
        body: eleitores?.map(e => [
          e.nome || '',
          e.cidade || '',
          e.bairro || '',
          e.whatsapp || e.telefone || ''
        ]) || [],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`cadastros_${usuarioNome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar usuário PDF:', error);
      alert('Erro ao gerar o arquivo PDF');
    }
  };

  // Função para exportar eleitores por confiabilidade para Excel
  const handleExportConfiabilidadeExcel = async (confiabilidade: string) => {
    if (!company?.uid) return;

    try {
      // Buscar eleitores com filtro de confiabilidade
      const query = supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid);
      
      // Aplicar filtro de confiabilidade_do_voto (pode ser null)
      if (confiabilidade && confiabilidade !== 'null') {
        query.eq('confiabilidade_do_voto', confiabilidade);
      } else {
        query.is('confiabilidade_do_voto', null);
      }
      
      const { data: eleitores, error } = await query
        .order('cidade')
        .order('nome');

      if (error) {
        console.error('Erro ao buscar eleitores:', error);
        throw error;
      }

      if (!eleitores || eleitores.length === 0) {
        alert('Nenhum eleitor encontrado para esta confiabilidade');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(confiabilidade);

      sheet.columns = getExcelColumns();

      eleitores?.forEach(eleitor => {
        sheet.addRow(formatEleitorForExcel(eleitor));
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eleitores_${confiabilidade.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar confiabilidade:', error);
      alert('Erro ao gerar o arquivo Excel');
    }
  };

  // Função para exportar eleitores por confiabilidade para PDF
  const handleExportConfiabilidadePDF = async (confiabilidade: string) => {
    if (!company?.uid) return;

    try {
      // Buscar eleitores com filtro de confiabilidade
      const query = supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid);
      
      // Aplicar filtro de confiabilidade_do_voto (pode ser null)
      if (confiabilidade && confiabilidade !== 'null') {
        query.eq('confiabilidade_do_voto', confiabilidade);
      } else {
        query.is('confiabilidade_do_voto', null);
      }
      
      const { data: eleitores, error } = await query
        .order('cidade')
        .order('nome');

      if (error) {
        console.error('Erro ao buscar eleitores:', error);
        throw error;
      }

      if (!eleitores || eleitores.length === 0) {
        alert('Nenhum eleitor encontrado para esta confiabilidade');
        return;
      }

      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(`Confiabilidade: ${confiabilidade}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Total: ${eleitores?.length || 0} eleitores`, 14, 22);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 27);

      (doc as any).autoTable({
        startY: 32,
        head: [['Nome', 'Cidade', 'Bairro', 'Telefone']],
        body: eleitores?.map(e => [
          e.nome || '',
          e.cidade || '',
          e.bairro || '',
          e.whatsapp || e.telefone || ''
        ]) || [],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`confiabilidade_${confiabilidade.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar confiabilidade PDF:', error);
      alert('Erro ao gerar o arquivo PDF');
    }
  };

  // Função para exportar eleitores por indicado para Excel
  const handleExportIndicadoExcel = async (indicadoNome: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*, gbp_indicado!inner(nome)')
        .eq('empresa_uid', company.uid)
        .eq('gbp_indicado.nome', indicadoNome)
        .order('cidade')
        .order('nome');

      if (error) {
        console.error('Erro ao buscar eleitores:', error);
        throw error;
      }

      if (!eleitores || eleitores.length === 0) {
        alert('Nenhum eleitor encontrado para este indicado');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(indicadoNome);

      sheet.columns = getExcelColumns();

      eleitores?.forEach(eleitor => {
        sheet.addRow(formatEleitorForExcel(eleitor));
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `indicados_${indicadoNome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar indicado:', error);
      alert('Erro ao gerar o arquivo Excel');
    }
  };

  // Função para exportar eleitores por indicado para PDF
  const handleExportIndicadoPDF = async (indicadoNome: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*, gbp_indicado!inner(nome)')
        .eq('empresa_uid', company.uid)
        .eq('gbp_indicado.nome', indicadoNome)
        .order('cidade')
        .order('nome');

      if (error) {
        console.error('Erro ao buscar eleitores:', error);
        throw error;
      }

      if (!eleitores || eleitores.length === 0) {
        alert('Nenhum eleitor encontrado para este indicado');
        return;
      }

      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(`Indicados - ${indicadoNome}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Total: ${eleitores?.length || 0} eleitores`, 14, 22);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 27);

      (doc as any).autoTable({
        startY: 32,
        head: [['Nome', 'Cidade', 'Bairro', 'Telefone']],
        body: eleitores?.map(e => [
          e.nome || '',
          e.cidade || '',
          e.bairro || '',
          e.whatsapp || e.telefone || ''
        ]) || [],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`indicados_${indicadoNome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar indicado PDF:', error);
      alert('Erro ao gerar o arquivo PDF');
    }
  };

  // Função para exportar eleitores por zona/seção para Excel
  const handleExportZonaExcel = async (zona: string, secao: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error} = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .eq('zona', zona)
        .eq('secao', secao)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar eleitores:', error);
        throw error;
      }

      if (!eleitores || eleitores.length === 0) {
        alert('Nenhum eleitor encontrado para esta zona/seção');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(`Zona ${zona} Seção ${secao}`);

      sheet.columns = getExcelColumns();

      eleitores?.forEach(eleitor => {
        sheet.addRow(formatEleitorForExcel(eleitor));
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `zona_${zona}_secao_${secao}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar zona/seção:', error);
      alert('Erro ao gerar o arquivo Excel');
    }
  };

  // Função para exportar eleitores por zona/seção para PDF
  const handleExportZonaPDF = async (zona: string, secao: string) => {
    if (!company?.uid) return;

    try {
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .eq('zona', zona)
        .eq('secao', secao)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar eleitores:', error);
        throw error;
      }

      if (!eleitores || eleitores.length === 0) {
        alert('Nenhum eleitor encontrado para esta zona/seção');
        return;
      }

      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(`Zona ${zona} - Seção ${secao}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Total: ${eleitores?.length || 0} eleitores`, 14, 22);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 27);

      (doc as any).autoTable({
        startY: 32,
        head: [['Nome', 'Cidade', 'Bairro', 'Telefone']],
        body: eleitores?.map(e => [
          e.nome || '',
          e.cidade || '',
          e.bairro || '',
          e.whatsapp || e.telefone || ''
        ]) || [],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`zona_${zona}_secao_${secao}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar zona/seção PDF:', error);
      alert('Erro ao gerar o arquivo PDF');
    }
  };

  // Função para exportar aniversariantes do mês para Excel
  const handleExportAniversariantesExcel = async () => {
    if (!company?.uid || aniversariantes.length === 0) return;

    try {
      const [year, month] = selectedMonth.split('-');
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthName = monthNames[parseInt(month) - 1];

      // Aplicar o filtro selecionado
      let filteredData = aniversariantes;
      let filterName = monthName;
      
      if (generoFilter === 'MASCULINO') {
        filteredData = aniversariantes.filter(e => e.genero?.toUpperCase() === 'MASCULINO');
        filterName = `${monthName} - Masculino`;
      } else if (generoFilter === 'FEMININO') {
        filteredData = aniversariantes.filter(e => e.genero?.toUpperCase() === 'FEMININO');
        filterName = `${monthName} - Feminino`;
      } else if (generoFilter === 'hoje') {
        const today = new Date();
        const todayDay = today.getDate();
        filteredData = aniversariantes.filter(e => {
          const [, , d] = e.nascimento.split('-').map(Number);
          return d === todayDay;
        });
        filterName = `${monthName} - Hoje`;
      } else if (generoFilter === '7dias') {
        const today = new Date();
        const todayDay = today.getDate();
        const startDay = Math.max(1, todayDay - 7);
        filteredData = aniversariantes.filter(e => {
          const [, , d] = e.nascimento.split('-').map(Number);
          return d >= startDay && d <= todayDay;
        });
        filterName = `${monthName} - Ultimos_7_Dias`;
      } else if (generoFilter === '15dias') {
        const today = new Date();
        const todayDay = today.getDate();
        const startDay = Math.max(1, todayDay - 15);
        filteredData = aniversariantes.filter(e => {
          const [, , d] = e.nascimento.split('-').map(Number);
          return d >= startDay && d <= todayDay;
        });
        filterName = `${monthName} - Ultimos_15_Dias`;
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(`Aniversariantes ${filterName}`);

      sheet.columns = [
        { header: 'Dia', key: 'dia', width: 8 },
        { header: 'Nome', key: 'nome', width: 35 },
        { header: 'Data de Nascimento', key: 'nascimento', width: 18 },
        { header: 'Idade', key: 'idade', width: 8 },
        { header: 'Gênero', key: 'genero', width: 12 },
        { header: 'WhatsApp', key: 'whatsapp', width: 16 },
        { header: 'Telefone', key: 'telefone', width: 16 },
        { header: 'Cidade', key: 'cidade', width: 20 },
        { header: 'Bairro', key: 'bairro', width: 20 }
      ];

      filteredData.forEach(eleitor => {
        const [y, m, d] = eleitor.nascimento.split('-').map(Number);
        const birthDate = new Date(y, m - 1, d);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        
        sheet.addRow({
          dia: birthDate.getDate(),
          nome: eleitor.nome || '',
          nascimento: birthDate.toLocaleDateString('pt-BR'),
          idade: age,
          genero: eleitor.genero || 'Não informado',
          whatsapp: eleitor.whatsapp || '',
          telefone: eleitor.telefone || '',
          cidade: eleitor.cidade || '',
          bairro: eleitor.bairro || ''
        });
      });

      // Estilo para o cabeçalho
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F0FF' }
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aniversariantes_${filterName.replace(/\s+/g, '_')}_${year}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar aniversariantes Excel:', error);
      alert('Erro ao gerar o arquivo Excel');
    }
  };

  // Função para exportar aniversariantes do mês para PDF
  const handleExportAniversariantesPDF = async () => {
    if (!company?.uid || aniversariantes.length === 0) return;

    try {
      const [year, month] = selectedMonth.split('-');
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthName = monthNames[parseInt(month) - 1];

      // Aplicar o filtro selecionado
      let filteredData = aniversariantes;
      let filterName = monthName;
      
      if (generoFilter === 'MASCULINO') {
        filteredData = aniversariantes.filter(e => e.genero?.toUpperCase() === 'MASCULINO');
        filterName = `${monthName} - Masculino`;
      } else if (generoFilter === 'FEMININO') {
        filteredData = aniversariantes.filter(e => e.genero?.toUpperCase() === 'FEMININO');
        filterName = `${monthName} - Feminino`;
      } else if (generoFilter === 'hoje') {
        const today = new Date();
        const todayDay = today.getDate();
        filteredData = aniversariantes.filter(e => {
          const [, , d] = e.nascimento.split('-').map(Number);
          return d === todayDay;
        });
        filterName = `${monthName} - Hoje`;
      } else if (generoFilter === '7dias') {
        const today = new Date();
        const todayDay = today.getDate();
        const startDay = Math.max(1, todayDay - 7);
        filteredData = aniversariantes.filter(e => {
          const [, , d] = e.nascimento.split('-').map(Number);
          return d >= startDay && d <= todayDay;
        });
        filterName = `${monthName} - Ultimos_7_Dias`;
      } else if (generoFilter === '15dias') {
        const today = new Date();
        const todayDay = today.getDate();
        const startDay = Math.max(1, todayDay - 15);
        filteredData = aniversariantes.filter(e => {
          const [, , d] = e.nascimento.split('-').map(Number);
          return d >= startDay && d <= todayDay;
        });
        filterName = `${monthName} - Ultimos_15_Dias`;
      }

      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(`Aniversariantes - ${filterName} ${year}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Total: ${filteredData.length} aniversariantes`, 14, 22);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 27);

      (doc as any).autoTable({
        startY: 32,
        head: [['Dia', 'Nome', 'Nascimento', 'Idade', 'Gênero', 'Telefone', 'Bairro']],
        body: filteredData.map(e => {
          const [y, m, d] = e.nascimento.split('-').map(Number);
          const birthDate = new Date(y, m - 1, d);
          const age = new Date().getFullYear() - birthDate.getFullYear();
          return [
            birthDate.getDate(),
            e.nome || '',
            birthDate.toLocaleDateString('pt-BR'),
            age,
            e.genero || 'N/A',
            e.whatsapp || e.telefone || '',
            e.bairro || ''
          ];
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`aniversariantes_${filterName.replace(/\s+/g, '_')}_${year}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar aniversariantes PDF:', error);
      alert('Erro ao gerar o arquivo PDF');
    }
  };

  // Função para exportar eleitores de um bairro específico para PDF
  const handleExportBairroPDF = async (cidade: string, bairro: string) => {
    if (!company?.uid) return;

    try {
      // Buscar eleitores e filtrar em memória com normalização
      // (une variações de acento, maiúsculas e espaços — mesmo critério da tela)
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', company.uid)
        .order('nome');

      if (error) throw error;

      const cidadeNorm = normalizarBusca(cidade);
      const bairroNorm = normalizarBusca(bairro);
      const filtrados = (eleitores || []).filter(e =>
        normalizarBusca(e.cidade || '') === cidadeNorm &&
        normalizarBusca(e.bairro || '') === bairroNorm
      );

      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(16);
      doc.text(`Eleitores - ${bairro}`, 14, 15);
      doc.setFontSize(12);
      doc.text(`${cidade}`, 14, 22);
      doc.setFontSize(10);
      doc.text(`Total: ${filtrados.length} eleitores`, 14, 28);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 33);

      // Tabela
      (doc as any).autoTable({
        startY: 38,
        head: [['Nome', 'Telefone', 'Endereço', 'Zona/Seção']],
        body: filtrados.map(e => [
          e.nome || '',
          e.whatsapp || e.telefone || '',
          `${e.logradouro || ''} ${e.numero || ''}`.trim(),
          `${e.zona || ''}/${e.secao || ''}`
        ]) || [],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`eleitores_${bairro}_${cidade}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar bairro PDF:', error);
      alert('Erro ao gerar o arquivo PDF');
    }
  };

  // Cabeçalho da página — sempre visível, inclusive durante o carregamento
  const headerContent = (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full shrink-0"
            title="Voltar"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate">
            Relatório de Cadastros
          </h1>
        </div>

        <Button
          onClick={handleExportExcel}
          disabled={!stats}
          title="Exporta o relatório completo com todas as seções da página"
          className="flex shrink-0 items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm sm:text-base"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar Relatório</span>
        </Button>
      </div>
    </div>
  );

  // Carregamento exibido com os próprios elementos da página:
  // esqueletos no formato dos cards e das seções de tabela
  if (loading) {
    return (
      <div className="p-0 sm:p-0" style={{ zoom: 0.9 }}>
        <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-0 sm:p-4">
          {headerContent}

          {/* Esqueleto dos 4 cards de estatísticas do topo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 sm:px-0 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4 sm:p-6 shadow-lg">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  </div>
                  <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800 rounded" />
                </div>
              </Card>
            ))}
          </div>

          {/* Esqueleto das seções de tabela */}
          {[1, 2, 3].map((section) => (
            <Card key={section} className="mt-4 mx-4 sm:mx-0 p-4 sm:p-6 shadow-lg animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex-1">
                  <div className="h-5 w-56 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-3 w-40 bg-gray-100 dark:bg-gray-800 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-9 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                {[1, 2, 3, 4].map((row) => (
                  <div key={row} className="h-8 w-full bg-gray-100 dark:bg-gray-800 rounded" />
                ))}
              </div>
            </Card>
          ))}

          <div className="flex items-center justify-center py-6 gap-2 text-gray-400 dark:text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Carregando relatório...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-0 sm:p-0" style={{ zoom: 0.9 }}>
        <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-0 sm:p-4">
          {headerContent}
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-gray-500">Nenhuma estatística disponível</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-0" style={{ zoom: 0.9 }}>
      <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-0 sm:p-4">
        {/* Header */}
        {headerContent}

        {/* Navegação rápida entre as seções do relatório */}
        <div className="sticky top-0 z-30 mb-4 px-4 sm:px-0 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm">
          <div
            ref={setupHorizontalScroll}
            className="flex gap-2 overflow-x-auto py-2 hide-scrollbar"
          >
            {secoesNavegacao.map((secao) => (
              <button
                key={secao.id}
                onClick={() => scrollParaSecao(secao.id)}
                className="whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:hover:bg-blue-600 dark:hover:text-white transition-colors shadow-sm"
              >
                {secao.label}
              </button>
            ))}
          </div>
          {/* Fade na borda direita (mobile): indica que há mais botões para rolar */}
          <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-gray-50 dark:from-gray-950 to-transparent pointer-events-none sm:hidden" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 px-4 sm:px-0">
          {/* Cabeçalho com Total e Líderes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card Total de Eleitores */}
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-lg">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-white">Total de Eleitores</h3>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                    <Users2 className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-300" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-white">
                    {stats.totalEleitores.toLocaleString()}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300">
                    eleitores
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                  <span>{stats.porCidade.length} cidades</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{stats.porBairro.length} bairros</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{new Set(stats.porZonaSecao.map(z => z.zona)).size} zonas</span>
                </div>
              </div>
            </Card>

            {/* Cidade Líder */}
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-lg">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-white">Cidade Líder</h3>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                    <Building2 className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-300" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-white">
                    {stats.porCidade[0]?.total.toLocaleString() || '0'}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300">
                    eleitores
                  </span>
                </div>
                <div className="flex flex-col space-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white truncate" title={stats.porCidade[0]?.cidade || '-'}>
                    {stats.porCidade[0]?.cidade || '-'}
                  </span>
                  <span>({((stats.porCidade[0]?.total / stats.totalEleitores) * 100).toFixed(1)}% do total)</span>
                </div>
              </div>
            </Card>

            {/* Bairro Líder */}
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-lg">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-white">Bairro Líder</h3>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                    <Home className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-300" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-white">
                    {stats.porBairro[0]?.total.toLocaleString() || '0'}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300">
                    eleitores
                  </span>
                </div>
                <div className="flex flex-col space-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white truncate" title={stats.porBairro[0]?.bairro || '-'}>
                    {stats.porBairro[0]?.bairro || '-'}
                  </span>
                  <span className="truncate" title={stats.porBairro[0]?.cidade || '-'}>
                    {stats.porBairro[0]?.cidade || '-'}
                  </span>
                  <span>({((stats.porBairro[0]?.total / stats.totalEleitores) * 100).toFixed(1)}% do total)</span>
                </div>
              </div>
            </Card>

            {/* Zona Líder */}
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-lg">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-medium text-gray-600 dark:text-white">Zona Líder</h3>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                    <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-300" />
                  </div>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-4xl font-bold text-blue-600 dark:text-white">
                    {stats.porZonaSecao[0]?.total.toLocaleString() || '0'}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-300">
                    eleitores
                  </span>
                </div>
                <div className="flex flex-col space-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Zona {stats.porZonaSecao[0]?.zona || '-'}
                  </span>
                  <span>Seção {stats.porZonaSecao[0]?.secao || '-'}</span>
                  <span>({((stats.porZonaSecao[0]?.total / stats.totalEleitores) * 100).toFixed(1)}% do total)</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Distribuição por Faixa Etária */}
          <Card id="secao-faixa-etaria" className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users2 className="w-5 h-5 text-blue-600" />
                  Distribuição por Faixa Etária
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Baseado na data de nascimento cadastrada
                  {faixasEtarias.semInfo > 0 && ` • ${faixasEtarias.semInfo} sem informação`}
                </p>
              </div>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shrink-0">
                <button
                  onClick={() => setFaixaEtariaView('tabela')}
                  className={`p-1.5 transition-colors ${faixaEtariaView === 'tabela' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  title="Visualizar cards"
                >
                  <Table2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFaixaEtariaView('grafico')}
                  className={`p-1.5 transition-colors ${faixaEtariaView === 'grafico' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  title="Visualizar gráfico"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {faixaEtariaView === 'grafico' ? (
              <div className="w-full">
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { faixa: '0 a 17 anos', total: faixasEtarias.ate17, cor: '#06b6d4' },
                        { faixa: '18 a 45 anos', total: faixasEtarias.de18a45, cor: '#2563eb' },
                        { faixa: '46 anos ou mais', total: faixasEtarias.mais46, cor: '#7c3aed' },
                        { faixa: 'Sem informação', total: faixasEtarias.semInfo, cor: '#9ca3af' }
                      ]}
                      margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                      barCategoryGap="40%"
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
                      <XAxis dataKey="faixa" tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: chartTick }} />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                        formatter={(value: number) => [`${value.toLocaleString('pt-BR')} eleitores`, 'Total']}
                        contentStyle={tooltipStyle}
                      />
                      <Bar dataKey="total" radius={[8, 8, 0, 0]} barSize={90}>
                        {['#06b6d4', '#2563eb', '#7c3aed', '#9ca3af'].map((cor, i) => (
                          <Cell key={i} fill={cor} />
                        ))}
                        <LabelList
                          dataKey="total"
                          position="top"
                          offset={8}
                          formatter={(v: number) => v.toLocaleString('pt-BR')}
                          style={{ fontSize: 14, fontWeight: 700, fill: chartLabel }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  Distribuição de eleitores por faixa etária (baseado na data de nascimento)
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'ate17', label: '0 a 17 anos', total: faixasEtarias.ate17, cor: 'bg-cyan-500', corFundo: 'bg-cyan-50 dark:bg-cyan-900/20', corTexto: 'text-cyan-700 dark:text-cyan-300' },
                { id: 'de18a45', label: '18 a 45 anos', total: faixasEtarias.de18a45, cor: 'bg-blue-600', corFundo: 'bg-blue-50 dark:bg-blue-900/20', corTexto: 'text-blue-700 dark:text-blue-300' },
                { id: 'mais46', label: '46 anos ou mais', total: faixasEtarias.mais46, cor: 'bg-violet-600', corFundo: 'bg-violet-50 dark:bg-violet-900/20', corTexto: 'text-violet-700 dark:text-violet-300' },
              ].map((faixa) => {
                const totalComInfo = stats.totalEleitores - faixasEtarias.semInfo;
                const porcentagem = totalComInfo > 0 ? (faixa.total / totalComInfo) * 100 : 0;
                return (
                  <div key={faixa.id} className={`relative rounded-lg p-4 ${faixa.corFundo}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${faixa.corTexto}`}>{faixa.label}</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-xl font-bold ${faixa.corTexto}`}>{faixa.total.toLocaleString()}</span>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuFaixa(openMenuFaixa === faixa.id ? null : faixa.id);
                            }}
                            className="p-1 hover:bg-white/60 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Exportar lista desta faixa"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                          </button>

                          {openMenuFaixa === faixa.id && (
                            <div
                              className="absolute right-0 top-7 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportFaixaExcel(faixa.id, faixa.label);
                                  setOpenMenuFaixa(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                              >
                                <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span>Excel</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportFaixaPDF(faixa.id, faixa.label);
                                  setOpenMenuFaixa(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                              >
                                <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                                <span>PDF</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`${faixa.cor} h-2 rounded-full transition-all`}
                        style={{ width: `${porcentagem}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      {porcentagem.toFixed(1)}% dos cadastros com data de nascimento
                    </p>
                  </div>
                );
              })}
            </div>
            )}
          </Card>

          {/* Qualidade do Cadastro — percentual de campos preenchidos */}
          <Card className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                  Qualidade do Cadastro
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Percentual de preenchimento dos campos — útil para saber quais dados faltam para a estratégia
                </p>
              </div>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shrink-0">
                <button
                  onClick={() => setQualidadeView('tabela')}
                  className={`p-1.5 transition-colors ${qualidadeView === 'tabela' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  title="Visualizar cards"
                >
                  <Table2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setQualidadeView('grafico')}
                  className={`p-1.5 transition-colors ${qualidadeView === 'grafico' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  title="Visualizar gráfico"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {qualidadeView === 'grafico' ? (
              <div className="w-full">
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={camposQualidade}
                        dataKey="pct"
                        nameKey="campo"
                        cx="50%"
                        cy="50%"
                        innerRadius="52%"
                        outerRadius="78%"
                        paddingAngle={3}
                        strokeWidth={0}
                        label={({ payload }: any) => `${payload.pct}%`}
                        labelLine={false}
                        fontSize={13}
                      >
                        {camposQualidade.map((c, i) => (
                          <Cell key={i} fill={c.pct >= 70 ? '#10b981' : c.pct >= 40 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value}% preenchido`, name]}
                        contentStyle={tooltipStyle}
                      />
                      <Legend formatter={(v: string) => <span className="text-sm text-gray-700 dark:text-gray-300">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  Verde: ≥70% preenchido • Amarelo: 40–69% • Vermelho: &lt;40%
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'WhatsApp', pct: coberturaCadastro.whatsapp },
                { label: 'Nascimento', pct: coberturaCadastro.nascimento },
                { label: 'Zona + Seção', pct: coberturaCadastro.zonaSecao },
                { label: 'Indicado', pct: coberturaCadastro.indicado },
                { label: 'Gênero', pct: coberturaCadastro.genero },
                { label: 'Bairro', pct: coberturaCadastro.bairro },
              ].map((item) => {
                const cor = item.pct >= 70 ? 'bg-emerald-500' : item.pct >= 40 ? 'bg-amber-400' : 'bg-red-400';
                const corTexto = item.pct >= 70 ? 'text-emerald-600 dark:text-emerald-400' : item.pct >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400';
                return (
                  <div key={item.label} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{item.label}</span>
                      <span className={`text-sm font-bold ${corTexto}`}>{item.pct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                      <div className={`${cor} h-1.5 rounded-full transition-all`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </Card>

          {/* Distribuição por Cidade com Análise de Crescimento */}
          <Card id="secao-cidades" className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Distribuição por Cidade
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total: {stats.porCidade.length} cidades • Análise de crescimento mensal e anual
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shrink-0">
                  <button
                    onClick={() => setCidadeView('tabela')}
                    className={`p-1.5 transition-colors ${cidadeView === 'tabela' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Visualizar tabela"
                  >
                    <Table2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCidadeView('grafico')}
                    className={`p-1.5 transition-colors ${cidadeView === 'grafico' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Visualizar gráfico"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={buscaCidade}
                    onChange={(e) => { setBuscaCidade(e.target.value); setCidadePage(1); }}
                    placeholder="Buscar cidade..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Cards de Destaques de Crescimento */}
            {!loadingCrescimento && crescimentoCidades.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Maior Crescimento Anual
                    </span>
                  </div>
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    {crescimentoCidades[0]?.cidade || '-'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    +{crescimentoCidades[0]?.crescimento_anual_percentual.toFixed(1)}% 
                    ({crescimentoCidades[0]?.crescimento_anual > 0 ? '+' : ''}{crescimentoCidades[0]?.crescimento_anual})
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Maior Crescimento Mensal
                    </span>
                  </div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {[...crescimentoCidades].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.cidade || '-'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    +{[...crescimentoCidades].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal_percentual.toFixed(1)}%
                    ({[...crescimentoCidades].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal > 0 ? '+' : ''}{[...crescimentoCidades].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal})
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Users2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Novos Este Ano
                    </span>
                  </div>
                  <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {crescimentoCidades.reduce((sum, c) => sum + c.novos_ano_atual, 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    vs {crescimentoCidades.reduce((sum, c) => sum + c.novos_ano_anterior, 0).toLocaleString()} ano anterior
                  </div>
                </div>
              </div>
            )}
            {cidadeView === 'grafico' ? (
              <div className="w-full">
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={cidadesFiltradas.slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 5, right: 70, left: 10, bottom: 5 }}
                      barCategoryGap="30%"
                    >
                      <defs>
                        <linearGradient id="gradCidade" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartGrid} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="cidade"
                        width={170}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 13, fill: chartTick }}
                        tickFormatter={(v: string) => v.length > 24 ? v.slice(0, 24) + '…' : v}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                        formatter={(value: number) => [`${value.toLocaleString('pt-BR')} eleitores`, 'Total']}
                        contentStyle={tooltipStyle}
                      />
                      <Bar dataKey="total" fill="url(#gradCidade)" radius={[0, 8, 8, 0]} barSize={26}>
                        <LabelList
                          dataKey="total"
                          position="right"
                          offset={8}
                          formatter={(v: number) => v.toLocaleString('pt-BR')}
                          style={{ fontSize: 13, fontWeight: 600, fill: chartLabel }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  Exibindo as {Math.min(10, cidadesFiltradas.length)} cidades com mais eleitores{buscaCidade ? ' (busca aplicada)' : ''}
                </p>
              </div>
            ) : (
            <div ref={setupHorizontalScroll}>
              <table style={{ minWidth: '900px', width: '100%' }}>
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-2 text-gray-900 dark:text-white">Cidade</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white">Total</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white">%</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Novos (Mês)</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Cresc. Mensal</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Novos (Ano)</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Cresc. Anual</th>
                      <th className="text-center py-2 text-gray-900 dark:text-white">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(cidadesFiltradas, cidadePage).map(({ cidade, total }, index, arr) => {
                      const percentage = (total / stats.totalEleitores) * 100;
                      const crescimento = crescimentoCidades.find(c => c.cidade === cidade);
                      // Nas últimas linhas o menu abre para cima para não ficar escondido atrás do próximo card
                      const abreParaCima = index >= arr.length - 2;
                      return (
                        <tr key={cidade} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${index === 0 ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                          <td className="py-2 text-gray-900 dark:text-white font-medium">{cidade}</td>
                          <td className="text-right py-2 text-gray-900 dark:text-white">{total}</td>
                          <td className="text-right py-2 text-gray-900 dark:text-white">{percentage.toFixed(1)}%</td>
                          
                          {/* Novos no Mês */}
                          <td className="text-right py-2 text-xs">
                            {crescimento ? (
                              <>
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {crescimento.novos_mes_atual}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 ml-1">
                                  (vs {crescimento.novos_mes_anterior})
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          
                          {/* Crescimento Mensal */}
                          <td className="text-right py-2 text-xs">
                            {crescimento ? (
                              <div className="flex items-center justify-end gap-1">
                                {crescimento.crescimento_mensal > 0 ? (
                                  <TrendingUp className="w-3 h-3 text-green-600" />
                                ) : crescimento.crescimento_mensal < 0 ? (
                                  <TrendingDown className="w-3 h-3 text-red-600" />
                                ) : null}
                                <span className={`font-medium ${
                                  crescimento.crescimento_mensal > 0 ? 'text-green-600 dark:text-green-400' :
                                  crescimento.crescimento_mensal < 0 ? 'text-red-600 dark:text-red-400' :
                                  'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {crescimento.crescimento_mensal > 0 ? '+' : ''}{crescimento.crescimento_mensal}
                                  ({crescimento.crescimento_mensal_percentual > 0 ? '+' : ''}{crescimento.crescimento_mensal_percentual.toFixed(0)}%)
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          
                          {/* Novos no Ano */}
                          <td className="text-right py-2 text-xs">
                            {crescimento ? (
                              <>
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {crescimento.novos_ano_atual}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 ml-1">
                                  (vs {crescimento.novos_ano_anterior})
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          
                          {/* Crescimento Anual */}
                          <td className="text-right py-2 text-xs">
                            {crescimento ? (
                              <div className="flex items-center justify-end gap-1">
                                {crescimento.crescimento_anual > 0 ? (
                                  <TrendingUp className="w-3 h-3 text-green-600" />
                                ) : crescimento.crescimento_anual < 0 ? (
                                  <TrendingDown className="w-3 h-3 text-red-600" />
                                ) : null}
                                <span className={`font-medium ${
                                  crescimento.crescimento_anual > 0 ? 'text-green-600 dark:text-green-400' :
                                  crescimento.crescimento_anual < 0 ? 'text-red-600 dark:text-red-400' :
                                  'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {crescimento.crescimento_anual > 0 ? '+' : ''}{crescimento.crescimento_anual}
                                  ({crescimento.crescimento_anual_percentual > 0 ? '+' : ''}{crescimento.crescimento_anual_percentual.toFixed(0)}%)
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-2">
                            <div className="relative flex items-center justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuCidade(openMenuCidade === cidade ? null : cidade);
                                }}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                title="Opções de exportação"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                              </button>
                              
                              {openMenuCidade === cidade && (
                                <div 
                                  className={`absolute right-0 ${abreParaCima ? 'bottom-8' : 'top-8'} z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportCidadeExcel(cidade);
                                      setOpenMenuCidade(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                  >
                                    <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span>Excel</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportCidadePDF(cidade);
                                      setOpenMenuCidade(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                  >
                                    <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                                    <span>PDF</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
            )}
            {cidadeView === 'tabela' && (
              <TablePagination
                currentPage={cidadePage}
                totalItems={cidadesFiltradas.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCidadePage}
              />
            )}
          </Card>

          {/* REMOVIDO: Seção duplicada - Integrada em "Distribuição por Cidade" */}
          {false && <Card className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Análise de Crescimento Estratégico
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Comparativo mensal e anual de novos cadastros por cidade
                </p>
              </div>
            </div>

            {loadingCrescimento ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : crescimentoCidades.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Nenhum dado de crescimento disponível
              </div>
            ) : (
              <>
                {/* Cards de Destaques */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Maior Crescimento Anual */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Maior Crescimento Anual
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {crescimentoCidades[0]?.cidade || '-'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      +{crescimentoCidades[0]?.crescimento_anual_percentual.toFixed(1)}% 
                      ({crescimentoCidades[0]?.crescimento_anual > 0 ? '+' : ''}{crescimentoCidades[0]?.crescimento_anual} cadastros)
                    </div>
                  </div>

                  {/* Maior Crescimento Mensal */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Maior Crescimento Mensal
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {[...crescimentoCidades].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.cidade || '-'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      +{[...crescimentoCidades].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal_percentual.toFixed(1)}%
                      ({[...crescimentoCidades].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal > 0 ? '+' : ''}{[...crescimentoCidades].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal} este mês)
                    </div>
                  </div>

                  {/* Total de Novos Cadastros Este Ano */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Users2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Novos Este Ano
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {crescimentoCidades.reduce((sum, c) => sum + c.novos_ano_atual, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      vs {crescimentoCidades.reduce((sum, c) => sum + c.novos_ano_anterior, 0).toLocaleString()} no ano anterior
                    </div>
                  </div>
                </div>

                {/* Tabela de Crescimento */}
                <div ref={setupHorizontalScroll}>
                  <table style={{ minWidth: '900px', width: '100%' }}>
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-2 text-gray-900 dark:text-white">Cidade</th>
                        <th className="text-right py-2 text-gray-900 dark:text-white">Total</th>
                        <th className="text-right py-2 text-gray-900 dark:text-white">Novos (Mês)</th>
                        <th className="text-right py-2 text-gray-900 dark:text-white">Cresc. Mensal</th>
                        <th className="text-right py-2 text-gray-900 dark:text-white">Novos (Ano)</th>
                        <th className="text-right py-2 text-gray-900 dark:text-white">Cresc. Anual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crescimentoCidades.slice(0, 10).map((cidade, index) => (
                        <tr key={cidade.cidade} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${index === 0 ? 'bg-green-50 dark:bg-green-900/30' : ''}`}>
                          <td className="py-2 text-gray-900 dark:text-white font-medium">{cidade.cidade}</td>
                          <td className="text-right py-2 text-gray-900 dark:text-white">{cidade.total_atual}</td>
                          <td className="text-right py-2">
                            <span className="text-gray-900 dark:text-white">
                              {cidade.novos_mes_atual}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                              (vs {cidade.novos_mes_anterior})
                            </span>
                          </td>
                          <td className="text-right py-2">
                            <div className="flex items-center justify-end gap-1">
                              {cidade.crescimento_mensal > 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              ) : cidade.crescimento_mensal < 0 ? (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                              ) : null}
                              <span className={`font-medium ${
                                cidade.crescimento_mensal > 0 ? 'text-green-600 dark:text-green-400' :
                                cidade.crescimento_mensal < 0 ? 'text-red-600 dark:text-red-400' :
                                'text-gray-600 dark:text-gray-400'
                              }`}>
                                {cidade.crescimento_mensal > 0 ? '+' : ''}{cidade.crescimento_mensal}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({cidade.crescimento_mensal_percentual > 0 ? '+' : ''}{cidade.crescimento_mensal_percentual.toFixed(1)}%)
                              </span>
                            </div>
                          </td>
                          <td className="text-right py-2">
                            <span className="text-gray-900 dark:text-white">
                              {cidade.novos_ano_atual}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                              (vs {cidade.novos_ano_anterior})
                            </span>
                          </td>
                          <td className="text-right py-2">
                            <div className="flex items-center justify-end gap-1">
                              {cidade.crescimento_anual > 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              ) : cidade.crescimento_anual < 0 ? (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                              ) : null}
                              <span className={`font-medium ${
                                cidade.crescimento_anual > 0 ? 'text-green-600 dark:text-green-400' :
                                cidade.crescimento_anual < 0 ? 'text-red-600 dark:text-red-400' :
                                'text-gray-600 dark:text-gray-400'
                              }`}>
                                {cidade.crescimento_anual > 0 ? '+' : ''}{cidade.crescimento_anual}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({cidade.crescimento_anual_percentual > 0 ? '+' : ''}{cidade.crescimento_anual_percentual.toFixed(1)}%)
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {crescimentoCidades.length > 10 && (
                  <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Mostrando top 10 cidades com maior crescimento anual
                  </div>
                )}
              </>
            )}
          </Card>}

          {/* Distribuição por Indicado com Análise de Crescimento */}
          <Card id="secao-indicados" className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Distribuição por Indicado
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total: {stats.porIndicado.length} indicados • Análise de crescimento mensal e anual
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shrink-0">
                  <button
                    onClick={() => setIndicadoView('tabela')}
                    className={`p-1.5 transition-colors ${indicadoView === 'tabela' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Visualizar tabela"
                  >
                    <Table2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIndicadoView('grafico')}
                    className={`p-1.5 transition-colors ${indicadoView === 'grafico' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Visualizar gráfico"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={buscaIndicado}
                    onChange={(e) => { setBuscaIndicado(e.target.value); setIndicadoPage(1); }}
                    placeholder="Buscar indicado..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Cards de Destaques de Crescimento */}
            {!loadingCrescimentoIndicados && crescimentoIndicados.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Maior Crescimento Anual
                    </span>
                  </div>
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    {crescimentoIndicados[0]?.indicado_nome || '-'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    +{crescimentoIndicados[0]?.crescimento_anual_percentual.toFixed(1)}% 
                    ({crescimentoIndicados[0]?.crescimento_anual > 0 ? '+' : ''}{crescimentoIndicados[0]?.crescimento_anual})
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Maior Crescimento Mensal
                    </span>
                  </div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {[...crescimentoIndicados].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.indicado_nome || '-'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    +{[...crescimentoIndicados].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal_percentual.toFixed(1)}%
                    ({[...crescimentoIndicados].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal > 0 ? '+' : ''}{[...crescimentoIndicados].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal})
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Users2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Novos Este Ano
                    </span>
                  </div>
                  <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {crescimentoIndicados.reduce((sum, c) => sum + c.novos_ano_atual, 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    vs {crescimentoIndicados.reduce((sum, c) => sum + c.novos_ano_anterior, 0).toLocaleString()} ano anterior
                  </div>
                </div>
              </div>
            )}

            {indicadoView === 'grafico' ? (
              <div className="w-full">
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={indicadosFiltrados.slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 5, right: 70, left: 10, bottom: 5 }}
                      barCategoryGap="30%"
                    >
                      <defs>
                        <linearGradient id="gradIndicado" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartGrid} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="indicado_nome"
                        width={170}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 13, fill: chartTick }}
                        tickFormatter={(v: string) => v.length > 24 ? v.slice(0, 24) + '…' : v}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(16,185,129,0.08)' }}
                        formatter={(value: number) => [`${value.toLocaleString('pt-BR')} eleitores`, 'Total']}
                        contentStyle={tooltipStyle}
                      />
                      <Bar dataKey="total" fill="url(#gradIndicado)" radius={[0, 8, 8, 0]} barSize={26}>
                        <LabelList
                          dataKey="total"
                          position="right"
                          offset={8}
                          formatter={(v: number) => v.toLocaleString('pt-BR')}
                          style={{ fontSize: 13, fontWeight: 600, fill: chartLabel }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  Exibindo os {Math.min(10, indicadosFiltrados.length)} indicados com mais eleitores{buscaIndicado ? ' (busca aplicada)' : ''}
                </p>
              </div>
            ) : (
            <div ref={setupHorizontalScroll}>
              <table style={{ minWidth: '900px', width: '100%' }}>
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-2 text-gray-900 dark:text-white">Indicado</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white">Total</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white">%</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Novos (Mês)</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Cresc. Mensal</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Novos (Ano)</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Cresc. Anual</th>
                    <th className="text-center py-2 text-gray-900 dark:text-white">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedData(indicadosFiltrados, indicadoPage).map((item, index, arr) => {
                    const percentage = (item.total / stats.totalEleitores) * 100;
                    const crescimento = crescimentoIndicados.find(c => c.indicado_nome === item.indicado_nome);
                    // Nas últimas linhas o menu abre para cima para não ficar escondido atrás do próximo card
                    const abreParaCima = index >= arr.length - 2;
                    return (
                      <tr key={item.indicado_nome} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${index === 0 ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                        <td className="py-2 text-gray-900 dark:text-white font-medium">{item.indicado_nome}</td>
                        <td className="text-right py-2 text-gray-900 dark:text-white">{item.total}</td>
                        <td className="text-right py-2 text-gray-900 dark:text-white">{percentage.toFixed(1)}%</td>
                        
                        {/* Novos no Mês */}
                        <td className="text-right py-2 text-xs">
                          {crescimento ? (
                            <>
                              <span className="text-gray-900 dark:text-white font-medium">
                                {crescimento.novos_mes_atual}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 ml-1">
                                (vs {crescimento.novos_mes_anterior})
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        
                        {/* Crescimento Mensal */}
                        <td className="text-right py-2 text-xs">
                          {crescimento ? (
                            <div className="flex items-center justify-end gap-1">
                              {crescimento.crescimento_mensal > 0 ? (
                                <TrendingUp className="w-3 h-3 text-green-600" />
                              ) : crescimento.crescimento_mensal < 0 ? (
                                <TrendingDown className="w-3 h-3 text-red-600" />
                              ) : null}
                              <span className={`font-medium ${
                                crescimento.crescimento_mensal > 0 ? 'text-green-600 dark:text-green-400' :
                                crescimento.crescimento_mensal < 0 ? 'text-red-600 dark:text-red-400' :
                                'text-gray-600 dark:text-gray-400'
                              }`}>
                                {crescimento.crescimento_mensal > 0 ? '+' : ''}{crescimento.crescimento_mensal}
                                ({crescimento.crescimento_mensal_percentual > 0 ? '+' : ''}{crescimento.crescimento_mensal_percentual.toFixed(0)}%)
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        
                        {/* Novos no Ano */}
                        <td className="text-right py-2 text-xs">
                          {crescimento ? (
                            <>
                              <span className="text-gray-900 dark:text-white font-medium">
                                {crescimento.novos_ano_atual}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 ml-1">
                                (vs {crescimento.novos_ano_anterior})
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        
                        {/* Crescimento Anual */}
                        <td className="text-right py-2 text-xs">
                          {crescimento ? (
                            <div className="flex items-center justify-end gap-1">
                              {crescimento.crescimento_anual > 0 ? (
                                <TrendingUp className="w-3 h-3 text-green-600" />
                              ) : crescimento.crescimento_anual < 0 ? (
                                <TrendingDown className="w-3 h-3 text-red-600" />
                              ) : null}
                              <span className={`font-medium ${
                                crescimento.crescimento_anual > 0 ? 'text-green-600 dark:text-green-400' :
                                crescimento.crescimento_anual < 0 ? 'text-red-600 dark:text-red-400' :
                                'text-gray-600 dark:text-gray-400'
                              }`}>
                                {crescimento.crescimento_anual > 0 ? '+' : ''}{crescimento.crescimento_anual}
                                ({crescimento.crescimento_anual_percentual > 0 ? '+' : ''}{crescimento.crescimento_anual_percentual.toFixed(0)}%)
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="relative flex items-center justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuIndicado(openMenuIndicado === item.indicado_nome ? null : item.indicado_nome);
                              }}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Opções de exportação"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                            
                            {openMenuIndicado === item.indicado_nome && (
                              <div 
                                className={`absolute right-0 ${abreParaCima ? 'bottom-8' : 'top-8'} z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportIndicadoExcel(item.indicado_nome);
                                    setOpenMenuIndicado(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                >
                                  <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <span>Excel</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportIndicadoPDF(item.indicado_nome);
                                    setOpenMenuIndicado(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                >
                                  <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                                  <span>PDF</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
            {indicadoView === 'tabela' && (
              <TablePagination
                currentPage={indicadoPage}
                totalItems={indicadosFiltrados.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setIndicadoPage}
              />
            )}
          </Card>

          {/* Distribuição por Categoria com Análise de Crescimento */}
          <Card id="secao-categorias" className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Distribuição por Categoria
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total: {categorias.length} categorias • Análise de crescimento mensal e anual
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shrink-0">
                  <button
                    onClick={() => setCategoriaView('tabela')}
                    className={`p-1.5 transition-colors ${categoriaView === 'tabela' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Visualizar tabela"
                  >
                    <Table2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCategoriaView('grafico')}
                    className={`p-1.5 transition-colors ${categoriaView === 'grafico' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Visualizar gráfico"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={buscaCategoria}
                    onChange={(e) => { setBuscaCategoria(e.target.value); setCategoriaPage(1); }}
                    placeholder="Buscar categoria..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Cards de Destaques de Crescimento */}
            {!loadingCrescimentoCategorias && crescimentoCategorias.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Maior Crescimento Anual
                    </span>
                  </div>
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    {crescimentoCategorias[0]?.categoria_nome || '-'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    +{crescimentoCategorias[0]?.crescimento_anual_percentual.toFixed(1)}% 
                    ({crescimentoCategorias[0]?.crescimento_anual > 0 ? '+' : ''}{crescimentoCategorias[0]?.crescimento_anual})
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Maior Crescimento Mensal
                    </span>
                  </div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {[...crescimentoCategorias].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.categoria_nome || '-'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    +{[...crescimentoCategorias].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal_percentual.toFixed(1)}%
                    ({[...crescimentoCategorias].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal > 0 ? '+' : ''}{[...crescimentoCategorias].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal})
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Users2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Novos Este Ano
                    </span>
                  </div>
                  <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {crescimentoCategorias.reduce((sum, c) => sum + c.novos_ano_atual, 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    vs {crescimentoCategorias.reduce((sum, c) => sum + c.novos_ano_anterior, 0).toLocaleString()} ano anterior
                  </div>
                </div>
              </div>
            )}

            {loadingCategorias ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {categoriaView === 'grafico' ? (
                  <div className="w-full">
                    <div className="h-[420px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={categoriasFiltradas.slice(0, 10)}
                          layout="vertical"
                          margin={{ top: 5, right: 70, left: 10, bottom: 5 }}
                          barCategoryGap="30%"
                        >
                          <defs>
                            <linearGradient id="gradCategoria" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#f59e0b" />
                              <stop offset="100%" stopColor="#ef4444" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartGrid} />
                          <XAxis type="number" hide />
                          <YAxis
                            type="category"
                            dataKey="nome"
                            width={170}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 13, fill: chartTick }}
                            tickFormatter={(v: string) => v.length > 24 ? v.slice(0, 24) + '…' : v}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(245,158,11,0.08)' }}
                            formatter={(value: number) => [`${value.toLocaleString('pt-BR')} eleitores`, 'Total']}
                            contentStyle={tooltipStyle}
                          />
                          <Bar dataKey="total" fill="url(#gradCategoria)" radius={[0, 8, 8, 0]} barSize={26}>
                            <LabelList
                              dataKey="total"
                              position="right"
                              offset={8}
                              formatter={(v: number) => v.toLocaleString('pt-BR')}
                              style={{ fontSize: 13, fontWeight: 600, fill: chartLabel }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                      Exibindo as {Math.min(10, categoriasFiltradas.length)} categorias com mais eleitores{buscaCategoria ? ' (busca aplicada)' : ''}
                    </p>
                  </div>
                ) : (
                <div ref={setupHorizontalScroll} className="overflow-x-auto pr-6">
                  <table style={{ minWidth: '1200px', width: '100%' }}>
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-2 text-gray-900 dark:text-white whitespace-nowrap">Categoria</th>
                        <th className="text-left py-2 text-gray-900 dark:text-white whitespace-nowrap">Tipo</th>
                        <th className="text-right py-2 text-gray-900 dark:text-white whitespace-nowrap">Total</th>
                        <th className="text-right py-2 text-gray-900 dark:text-white whitespace-nowrap">%</th>
                        <th className="px-4 py-2 text-gray-900 dark:text-white whitespace-nowrap">Progresso</th>
                        <th className="text-right py-2 text-gray-900 dark:text-white whitespace-nowrap text-[11px]">Novos (Mês)</th>
                        <th className="text-right py-2 text-gray-900 dark:text-white whitespace-nowrap text-[11px]">Cresc. Mensal</th>
                        <th className="text-right py-2 text-gray-900 dark:text-white whitespace-nowrap text-[11px]">Novos (Ano)</th>
                        <th className="text-right py-2 text-gray-900 dark:text-white whitespace-nowrap text-[11px]">Cresc. Anual</th>
                        <th className="text-center py-2 text-gray-900 dark:text-white whitespace-nowrap text-[11px] min-w-[72px]">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData(categoriasFiltradas, categoriaPage).map((categoria, index, arr) => {
                        const percentage = stats ? (categoria.total / stats.totalEleitores) * 100 : 0;
                        const crescimento = crescimentoCategorias.find(c => c.categoria_nome === categoria.nome);
                        // Nas últimas linhas o menu abre para cima para não ficar escondido atrás do próximo card
                        const abreParaCima = index >= arr.length - 2;
                        return (
                          <tr key={categoria.categoria_uid} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${index === 0 ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                            <td className="py-2 text-gray-900 dark:text-white font-medium">
                              <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                {categoria.nome}
                              </div>
                            </td>
                            <td className="py-2 text-gray-600 dark:text-gray-400 text-sm">
                              {categoria.tipo || 'Não informado'}
                            </td>
                            <td className="text-right py-2 text-gray-900 dark:text-white">{categoria.total}</td>
                            <td className="text-right py-2 text-gray-900 dark:text-white">{percentage.toFixed(1)}%</td>
                            <td className="px-4 py-2">
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <div
                                  className={`h-2.5 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-blue-400'}`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                ></div>
                              </div>
                            </td>
                            
                            {/* Novos no Mês */}
                            <td className="text-right py-2 text-xs">
                              {crescimento ? (
                                <>
                                  <span className="text-gray-900 dark:text-white font-medium">
                                    {crescimento.novos_mes_atual}
                                  </span>
                                  <span className="text-gray-500 dark:text-gray-400 ml-1">
                                    (vs {crescimento.novos_mes_anterior})
                                  </span>
                                </>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            
                            {/* Crescimento Mensal */}
                            <td className="text-right py-2 text-xs">
                              {crescimento ? (
                                <div className="flex items-center justify-end gap-1">
                                  {crescimento.crescimento_mensal > 0 ? (
                                    <TrendingUp className="w-3 h-3 text-green-600" />
                                  ) : crescimento.crescimento_mensal < 0 ? (
                                    <TrendingDown className="w-3 h-3 text-red-600" />
                                  ) : null}
                                  <span className={`font-medium ${
                                    crescimento.crescimento_mensal > 0 ? 'text-green-600 dark:text-green-400' :
                                    crescimento.crescimento_mensal < 0 ? 'text-red-600 dark:text-red-400' :
                                    'text-gray-600 dark:text-gray-400'
                                  }`}>
                                    {crescimento.crescimento_mensal > 0 ? '+' : ''}{crescimento.crescimento_mensal}
                                    ({crescimento.crescimento_mensal_percentual > 0 ? '+' : ''}{crescimento.crescimento_mensal_percentual.toFixed(0)}%)
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            
                            {/* Novos no Ano */}
                            <td className="text-right py-2 text-xs">
                              {crescimento ? (
                                <>
                                  <span className="text-gray-900 dark:text-white font-medium">
                                    {crescimento.novos_ano_atual}
                                  </span>
                                  <span className="text-gray-500 dark:text-gray-400 ml-1">
                                    (vs {crescimento.novos_ano_anterior})
                                  </span>
                                </>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            
                            {/* Crescimento Anual */}
                            <td className="text-right py-2 text-xs">
                              {crescimento ? (
                                <div className="flex items-center justify-end gap-1">
                                  {crescimento.crescimento_anual > 0 ? (
                                    <TrendingUp className="w-3 h-3 text-green-600" />
                                  ) : crescimento.crescimento_anual < 0 ? (
                                    <TrendingDown className="w-3 h-3 text-red-600" />
                                  ) : null}
                                  <span className={`font-medium ${
                                    crescimento.crescimento_anual > 0 ? 'text-green-600 dark:text-green-400' :
                                    crescimento.crescimento_anual < 0 ? 'text-red-600 dark:text-red-400' :
                                    'text-gray-600 dark:text-gray-400'
                                  }`}>
                                    {crescimento.crescimento_anual > 0 ? '+' : ''}{crescimento.crescimento_anual}
                                    ({crescimento.crescimento_anual_percentual > 0 ? '+' : ''}{crescimento.crescimento_anual_percentual.toFixed(0)}%)
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-2 min-w-[72px]">
                              <div className="relative flex items-center justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuCategoria(openMenuCategoria === categoria.categoria_uid ? null : categoria.categoria_uid);
                                  }}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                >
                                  <MoreVertical className="h-5 w-5 text-gray-500" />
                                </button>
                                
                                {openMenuCategoria === categoria.categoria_uid && (
                                  <div className={`absolute right-0 ${abreParaCima ? 'bottom-8' : 'top-8'} z-50 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700`}>
                                    <button
                                      onClick={() => {
                                        exportarCategoriaExcel(categoria.categoria_uid, categoria.nome);
                                        setOpenMenuCategoria(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                    >
                                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                      Exportar Excel
                                    </button>
                                    <button
                                      onClick={() => {
                                        exportarCategoriaPDF(categoria.categoria_uid, categoria.nome);
                                        setOpenMenuCategoria(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                    >
                                      <FileText className="h-4 w-4 text-red-600" />
                                      Exportar PDF
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                )}
                {categoriaView === 'tabela' && (
                  <TablePagination
                    currentPage={categoriaPage}
                    totalItems={categoriasFiltradas.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCategoriaPage}
                  />
                )}
              </>
            )}
          </Card>

          {/* Distribuição por Bairro com Análise de Crescimento */}
          <Card id="secao-bairros" className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Distribuição por Bairro
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total: {stats.porBairro.length} bairros em {new Set(stats.porBairro.map(b => b.cidade)).size} cidades • Análise de crescimento mensal e anual
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shrink-0">
                  <button
                    onClick={() => setBairroView('tabela')}
                    className={`p-1.5 transition-colors ${bairroView === 'tabela' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Visualizar tabela"
                  >
                    <Table2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setBairroView('grafico')}
                    className={`p-1.5 transition-colors ${bairroView === 'grafico' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Visualizar gráfico"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={buscaBairro}
                    onChange={(e) => { setBuscaBairro(e.target.value); setBairroPage(1); }}
                    placeholder="Buscar bairro ou cidade..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Cards de Destaques de Crescimento */}
            {!loadingCrescimentoBairros && crescimentoBairros.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Maior Crescimento Anual
                    </span>
                  </div>
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    {crescimentoBairros[0]?.bairro || '-'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {crescimentoBairros[0]?.cidade} • +{crescimentoBairros[0]?.crescimento_anual_percentual.toFixed(1)}% 
                    ({crescimentoBairros[0]?.crescimento_anual > 0 ? '+' : ''}{crescimentoBairros[0]?.crescimento_anual})
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Maior Crescimento Mensal
                    </span>
                  </div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {[...crescimentoBairros].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.bairro || '-'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {[...crescimentoBairros].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.cidade} • +{[...crescimentoBairros].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal_percentual.toFixed(1)}%
                    ({[...crescimentoBairros].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal > 0 ? '+' : ''}{[...crescimentoBairros].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal})
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Users2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Novos Este Ano
                    </span>
                  </div>
                  <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {crescimentoBairros.reduce((sum, c) => sum + c.novos_ano_atual, 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    vs {crescimentoBairros.reduce((sum, c) => sum + c.novos_ano_anterior, 0).toLocaleString()} ano anterior
                  </div>
                </div>
              </div>
            )}

            {bairroView === 'grafico' ? (
              <div className="w-full">
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={bairrosFiltrados.slice(0, 10).map(b => ({ ...b, rotulo: `${b.bairro} · ${b.cidade}` }))}
                      layout="vertical"
                      margin={{ top: 5, right: 70, left: 10, bottom: 5 }}
                      barCategoryGap="30%"
                    >
                      <defs>
                        <linearGradient id="gradBairro" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#0ea5e9" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartGrid} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="rotulo"
                        width={170}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: chartTick }}
                        tickFormatter={(v: string) => v.length > 26 ? v.slice(0, 26) + '…' : v}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(6,182,212,0.08)' }}
                        formatter={(value: number) => [`${value.toLocaleString('pt-BR')} eleitores`, 'Total']}
                        contentStyle={tooltipStyle}
                      />
                      <Bar dataKey="total" fill="url(#gradBairro)" radius={[0, 8, 8, 0]} barSize={26}>
                        <LabelList
                          dataKey="total"
                          position="right"
                          offset={8}
                          formatter={(v: number) => v.toLocaleString('pt-BR')}
                          style={{ fontSize: 13, fontWeight: 600, fill: chartLabel }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  Exibindo os {Math.min(10, bairrosFiltrados.length)} bairros com mais eleitores{buscaBairro ? ' (busca aplicada)' : ''}
                </p>
              </div>
            ) : (
            <div className="space-y-6">
              {getPaginatedData(
                Object.entries(
                  bairrosFiltrados.reduce((acc, curr) => {
                    if (!acc[curr.cidade]) {
                      acc[curr.cidade] = [];
                    }
                    acc[curr.cidade].push(curr);
                    return acc;
                  }, {} as Record<string, typeof stats.porBairro>)
                )
                  .sort(([, a], [, b]) => b[0].total - a[0].total),
                bairroPage,
                bairrosPerPage
              ).map(([cidade, bairros]) => {
                const cidadeTotal = bairros.reduce((sum, b) => sum + b.total, 0);
                const cidadePercentage = (cidadeTotal / stats.totalEleitores) * 100;
                const currentPage = getBairroPage(cidade);
                const paginatedBairros = bairros
                  .sort((a, b) => b.total - a.total)
                  .slice((currentPage - 1) * bairrosPerPage, currentPage * bairrosPerPage);

                return (
                  <div key={cidade} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    {/* Cabeçalho da Cidade */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-2 border-b dark:border-gray-700">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-white">{cidade}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {bairros.length} bairros | Total: {cidadeTotal} ({cidadePercentage.toFixed(1)}%)
                        </p>
                      </div>
                    </div>

                    {/* Tabela de Bairros */}
                    <div ref={setupHorizontalScroll} className="overflow-x-auto">
                      <div className="w-full">
                        <table style={{ minWidth: '1100px', width: '100%' }}>
                          <thead>
                            <tr className="border-b dark:border-gray-700">
                              <th className="text-left py-1.5 text-gray-900 dark:text-white whitespace-nowrap">Bairro</th>
                              <th className="text-right py-1.5 text-gray-900 dark:text-white whitespace-nowrap">Total</th>
                              <th className="text-right py-1.5 text-gray-900 dark:text-white whitespace-nowrap">% Cidade</th>
                              <th className="px-2 py-1.5 text-gray-900 dark:text-white whitespace-nowrap">Progresso</th>
                              <th className="text-right py-1.5 text-gray-900 dark:text-white whitespace-nowrap text-[11px]">Novos (Mês)</th>
                              <th className="text-right py-1.5 text-gray-900 dark:text-white whitespace-nowrap text-[11px]">Cresc. Mensal</th>
                              <th className="text-right py-1.5 text-gray-900 dark:text-white whitespace-nowrap text-[11px]">Novos (Ano)</th>
                              <th className="text-right py-1.5 pr-6 text-gray-900 dark:text-white whitespace-nowrap text-[11px]">Cresc. Anual</th>
                              <th className="sticky right-0 w-[40px] min-w-[40px] px-0.5 py-1.5 text-center text-gray-900 dark:text-white whitespace-nowrap text-[11px] bg-gray-50 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
                                Ações
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedBairros.map((bairro, index, arr) => {
                              const percentageTotal = (bairro.total / stats.totalEleitores) * 100;
                              const percentageCidade = (bairro.total / cidadeTotal) * 100;
                              const crescimento = crescimentoBairros.find(c => c.cidade === bairro.cidade && c.bairro === bairro.bairro);
                              // Nas últimas linhas o menu abre para cima para não ficar escondido atrás do próximo card
                              const abreParaCima = index >= arr.length - 2;

                              return (
                                <tr
                                  key={`${bairro.cidade}-${bairro.bairro}`}
                                  className={`border-b dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 transition-colors ${
                                    index === 0 ? 'bg-green-50/50 dark:bg-green-900/30' : ''
                                  }`}
                                >
                                  <td className="py-1.5 pr-2 text-gray-900 dark:text-white font-medium">{bairro.bairro}</td>
                                  <td className="text-right py-1.5 px-1 text-gray-900 dark:text-white">{bairro.total}</td>
                                  <td className="text-right py-1.5 px-1 text-gray-900 dark:text-white">{percentageCidade.toFixed(1)}%</td>
                                  <td className="px-2 py-1.5">
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                      <div
                                        className={`h-2.5 rounded-full ${
                                          index === 0 ? 'bg-green-600' : 'bg-green-400'
                                        }`}
                                        style={{ width: `${percentageCidade}%` }}
                                      ></div>
                                    </div>
                                  </td>
                                  
                                  {/* Novos no Mês */}
                                  <td className="text-right py-1.5 text-xs whitespace-nowrap">
                                    {crescimento ? (
                                      <>
                                        <span className="text-gray-900 dark:text-white font-medium">
                                          {crescimento.novos_mes_atual}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400 ml-1">
                                          (vs {crescimento.novos_mes_anterior})
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  
                                  {/* Crescimento Mensal */}
                                  <td className="text-right py-1.5 text-xs whitespace-nowrap">
                                    {crescimento ? (
                                      <div className="flex items-center justify-end gap-1">
                                        {crescimento.crescimento_mensal > 0 ? (
                                          <TrendingUp className="w-3 h-3 text-green-600" />
                                        ) : crescimento.crescimento_mensal < 0 ? (
                                          <TrendingDown className="w-3 h-3 text-red-600" />
                                        ) : null}
                                        <span className={`font-medium ${
                                          crescimento.crescimento_mensal > 0 ? 'text-green-600 dark:text-green-400' :
                                          crescimento.crescimento_mensal < 0 ? 'text-red-600 dark:text-red-400' :
                                          'text-gray-600 dark:text-gray-400'
                                        }`}>
                                          {crescimento.crescimento_mensal > 0 ? '+' : ''}{crescimento.crescimento_mensal}
                                          ({crescimento.crescimento_mensal_percentual > 0 ? '+' : ''}{crescimento.crescimento_mensal_percentual.toFixed(0)}%)
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  
                                  {/* Novos no Ano */}
                                  <td className="text-right py-1.5 text-xs whitespace-nowrap">
                                    {crescimento ? (
                                      <>
                                        <span className="text-gray-900 dark:text-white font-medium">
                                          {crescimento.novos_ano_atual}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400 ml-1">
                                          (vs {crescimento.novos_ano_anterior})
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  
                                  {/* Crescimento Anual */}
                                  <td className="text-right py-1.5 pr-6 text-xs whitespace-nowrap">
                                    {crescimento ? (
                                      <div className="flex items-center justify-end gap-1">
                                        {crescimento.crescimento_anual > 0 ? (
                                          <TrendingUp className="w-3 h-3 text-green-600" />
                                        ) : crescimento.crescimento_anual < 0 ? (
                                          <TrendingDown className="w-3 h-3 text-red-600" />
                                        ) : null}
                                        <span className={`font-medium ${
                                          crescimento.crescimento_anual > 0 ? 'text-green-600 dark:text-green-400' :
                                          crescimento.crescimento_anual < 0 ? 'text-red-600 dark:text-red-400' :
                                          'text-gray-600 dark:text-gray-400'
                                        }`}>
                                          {crescimento.crescimento_anual > 0 ? '+' : ''}{crescimento.crescimento_anual}
                                          ({crescimento.crescimento_anual_percentual > 0 ? '+' : ''}{crescimento.crescimento_anual_percentual.toFixed(0)}%)
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="sticky right-0 w-[40px] min-w-[40px] px-0.5 py-1.5 bg-inherit border-l border-gray-200/70 dark:border-gray-600/70">
                                    <div className="relative flex items-center justify-center">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuBairro(openMenuBairro === `${bairro.cidade}-${bairro.bairro}` ? null : `${bairro.cidade}-${bairro.bairro}`);
                                        }}
                                        className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                                        title="Opções de exportação"
                                      >
                                        <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                      </button>
                                      
                                      {openMenuBairro === `${bairro.cidade}-${bairro.bairro}` && (
                                        <div 
                                          className={`absolute right-0 ${abreParaCima ? 'bottom-8' : 'top-8'} z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleExportBairroExcel(bairro.cidade, bairro.bairro);
                                              setOpenMenuBairro(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                          >
                                            <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                            <span>Excel</span>
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleExportBairroPDF(bairro.cidade, bairro.bairro);
                                              setOpenMenuBairro(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                          >
                                            <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                                            <span>PDF</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <TablePagination
                      currentPage={currentPage}
                      totalItems={bairros.length}
                      itemsPerPage={bairrosPerPage}
                      onPageChange={(page) => handleBairroPageChange(cidade, page)}
                    />
                  </div>
                );
              })}
              <TablePagination
                currentPage={bairroPage}
                totalItems={Object.keys(
                  bairrosFiltrados.reduce((acc, curr) => {
                    if (!acc[curr.cidade]) {
                      acc[curr.cidade] = [];
                    }
                    acc[curr.cidade].push(curr);
                    return acc;
                  }, {} as Record<string, typeof stats.porBairro>)
                ).length}
                itemsPerPage={bairrosPerPage}
                onPageChange={setBairroPage}
              />
            </div>
            )}
          </Card>

          {/* Distribuição por Logradouro */}
          <Card id="secao-logradouros" className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Route className="h-5 w-5 text-blue-500" />
                  Distribuição por Logradouro
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ruas agrupadas por bairro e cidade — clique na linha para ver os eleitores cadastrados e seus atendimentos
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shrink-0">
                  <button
                    onClick={() => setLogradouroView('tabela')}
                    className={`p-1.5 transition-colors ${logradouroView === 'tabela' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Visualizar tabela"
                  >
                    <Table2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setLogradouroView('grafico')}
                    className={`p-1.5 transition-colors ${logradouroView === 'grafico' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Visualizar gráfico"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative flex-1 sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={buscaLogradouro}
                    onChange={(e) => { setBuscaLogradouro(e.target.value); setLogradouroPage(1); }}
                    placeholder="Buscar rua, bairro ou cidade..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {logradouroView === 'grafico' ? (
              <div className="w-full">
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={logradourosFiltrados.slice(0, 10).map(l => ({ ...l, rotulo: `${l.logradouro} · ${l.bairro}` }))}
                      layout="vertical"
                      margin={{ top: 5, right: 70, left: 10, bottom: 5 }}
                      barCategoryGap="30%"
                    >
                      <defs>
                        <linearGradient id="gradLogradouro" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartGrid} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="rotulo"
                        width={200}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: chartTick }}
                        tickFormatter={(v: string) => v.length > 30 ? v.slice(0, 30) + '…' : v}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                        formatter={(value: number) => [`${value.toLocaleString('pt-BR')} eleitores`, 'Total']}
                        contentStyle={tooltipStyle}
                      />
                      <Bar dataKey="total" fill="url(#gradLogradouro)" radius={[0, 8, 8, 0]} barSize={26}>
                        <LabelList
                          dataKey="total"
                          position="right"
                          offset={8}
                          formatter={(v: number) => v.toLocaleString('pt-BR')}
                          style={{ fontSize: 13, fontWeight: 600, fill: chartLabel }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  Exibindo os {Math.min(10, logradourosFiltrados.length)} logradouros com mais eleitores{buscaLogradouro ? ' (busca aplicada)' : ''}
                </p>
              </div>
            ) : (
            <>
            <div ref={setupHorizontalScroll} className="overflow-x-auto">
              <table style={{ minWidth: '700px', width: '100%' }} className="text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Logradouro</th>
                    <th className="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Bairro</th>
                    <th className="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Cidade</th>
                    <th className="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400 text-center">Eleitores</th>
                    <th className="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400 text-center">Atendimentos</th>
                    <th className="py-2 pr-4 font-medium text-gray-500 dark:text-gray-400 text-center">Ações</th>
                    <th className="py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedData(logradourosFiltrados, logradouroPage).map((grupo, idx, arr) => {
                    const chave = `${grupo.logradouro}|${grupo.bairro}|${grupo.cidade}`;
                    const expandido = logradouroExpandido === chave;
                    const abreParaCima = idx >= arr.length - 3;
                    const totalAtendimentosRua = grupo.eleitores.reduce(
                      (sum, e) => sum + (stats.atendimentosPorEleitor[e.uid]?.length || 0), 0
                    );
                    return [
                      <tr
                        key={chave}
                        onClick={() => setLogradouroExpandido(expandido ? null : chave)}
                        className="border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="py-2 pr-4 text-gray-900 dark:text-white font-medium">{grupo.logradouro}</td>
                        <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{grupo.bairro}</td>
                        <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{grupo.cidade}</td>
                        <td className="py-2 pr-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium">
                            {grupo.total}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-center">
                          {totalAtendimentosRua > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-medium">
                              {totalAtendimentosRua}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <div className="relative flex items-center justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuLogradouro(openMenuLogradouro === chave ? null : chave);
                              }}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Opções de exportação"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>

                            {openMenuLogradouro === chave && (
                              <div
                                className={`absolute right-0 ${abreParaCima ? 'bottom-8' : 'top-8'} z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportLogradouroExcel(grupo.logradouro, grupo.bairro, grupo.cidade);
                                    setOpenMenuLogradouro(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                >
                                  <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <span>Excel</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportLogradouroPDF(grupo);
                                    setOpenMenuLogradouro(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                >
                                  <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                                  <span>PDF</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2 text-gray-400">
                          <ChevronDown className={`h-4 w-4 transition-transform ${expandido ? 'rotate-180' : ''}`} />
                        </td>
                      </tr>,
                      expandido && (
                        <tr key={`${chave}-detalhe`} className="border-b border-gray-100 dark:border-gray-800">
                          <td colSpan={7} className="py-3 px-4 bg-gray-50 dark:bg-gray-800/60">
                            <div className="space-y-2">
                              {grupo.eleitores.map((eleitor) => {
                                const atendimentos = stats.atendimentosPorEleitor[eleitor.uid] || [];
                                const mostrarAtendimentos = !!atendimentosVisiveis[eleitor.uid];
                                return (
                                  <div key={eleitor.uid} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                                        {eleitor.nome}
                                        {eleitor.numero && (
                                          <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">Nº {eleitor.numero}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 text-xs">
                                        {eleitor.whatsapp && (
                                          <span className="text-gray-500 dark:text-gray-400">{eleitor.whatsapp}</span>
                                        )}
                                        {atendimentos.length > 0 ? (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setAtendimentosVisiveis(prev => ({ ...prev, [eleitor.uid]: !prev[eleitor.uid] }));
                                            }}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-medium hover:opacity-80"
                                          >
                                            {atendimentos.length} atendimento{atendimentos.length > 1 ? 's' : ''}
                                            <ChevronDown className={`h-3 w-3 transition-transform ${mostrarAtendimentos ? 'rotate-180' : ''}`} />
                                          </button>
                                        ) : (
                                          <span className="text-gray-400 dark:text-gray-500">Sem atendimentos</span>
                                        )}
                                      </div>
                                    </div>
                                    {mostrarAtendimentos && atendimentos.length > 0 && (
                                      <div className="mt-2 pl-2 border-l-2 border-purple-200 dark:border-purple-800 space-y-1.5">
                                        {atendimentos.map((at, idx) => (
                                          <div key={idx} className="text-xs text-gray-600 dark:text-gray-300">
                                            <span className="font-medium">
                                              {at.data_atendimento ? new Date(at.data_atendimento).toLocaleDateString('pt-BR') : 'Sem data'}
                                            </span>
                                            {at.tipo_de_atendimento && <span className="ml-2">{at.tipo_de_atendimento}</span>}
                                            {at.status && (
                                              <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                {at.status}
                                              </span>
                                            )}
                                            {at.descricao && <div className="mt-0.5 text-gray-500 dark:text-gray-400">{at.descricao}</div>}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )
                    ];
                  })}
                </tbody>
              </table>
            </div>

            {logradourosFiltrados.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Nenhum logradouro encontrado.
              </p>
            )}

            <TablePagination
              currentPage={logradouroPage}
              totalItems={logradourosFiltrados.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setLogradouroPage}
            />
            </>
            )}
          </Card>

          {/* Distribuição por Zona e Seção com Análise de Crescimento */}
          <Card id="secao-zonas" className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Distribuição por Zona e Seção
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total: {stats.porZonaSecao.length} zonas/seções • Análise de crescimento mensal e anual
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shrink-0">
                  <button
                    onClick={() => setZonaView('tabela')}
                    className={`p-1.5 transition-colors ${zonaView === 'tabela' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Visualizar tabela"
                  >
                    <Table2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZonaView('grafico')}
                    className={`p-1.5 transition-colors ${zonaView === 'grafico' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Visualizar gráfico"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={buscaZona}
                    onChange={(e) => { setBuscaZona(e.target.value); setZonaPage(1); }}
                    placeholder="Buscar zona/seção..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Cards de Destaques de Crescimento */}
            {!loadingCrescimentoZonasSecoes && crescimentoZonasSecoes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Maior Crescimento Anual
                    </span>
                  </div>
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    Zona {crescimentoZonasSecoes[0]?.zona} - Seção {crescimentoZonasSecoes[0]?.secao}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    +{crescimentoZonasSecoes[0]?.crescimento_anual_percentual.toFixed(1)}% 
                    ({crescimentoZonasSecoes[0]?.crescimento_anual > 0 ? '+' : ''}{crescimentoZonasSecoes[0]?.crescimento_anual})
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Maior Crescimento Mensal
                    </span>
                  </div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    Zona {[...crescimentoZonasSecoes].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.zona} - Seção {[...crescimentoZonasSecoes].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.secao}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    +{[...crescimentoZonasSecoes].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal_percentual.toFixed(1)}%
                    ({[...crescimentoZonasSecoes].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal > 0 ? '+' : ''}{[...crescimentoZonasSecoes].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal})
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Users2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Novos Este Ano
                    </span>
                  </div>
                  <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {crescimentoZonasSecoes.reduce((sum, c) => sum + c.novos_ano_atual, 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    vs {crescimentoZonasSecoes.reduce((sum, c) => sum + c.novos_ano_anterior, 0).toLocaleString()} ano anterior
                  </div>
                </div>
              </div>
            )}

            {zonaView === 'grafico' ? (
              <div className="w-full">
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={zonasFiltradas.slice(0, 10).map(z => ({ ...z, rotulo: `Zona ${z.zona} · Seção ${z.secao}` }))}
                      layout="vertical"
                      margin={{ top: 5, right: 70, left: 10, bottom: 5 }}
                      barCategoryGap="30%"
                    >
                      <defs>
                        <linearGradient id="gradZona" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#ec4899" />
                          <stop offset="100%" stopColor="#f43f5e" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartGrid} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="rotulo"
                        width={150}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: chartTick }}
                        tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 22) + '…' : v}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(236,72,153,0.08)' }}
                        formatter={(value: number) => [`${value.toLocaleString('pt-BR')} eleitores`, 'Total']}
                        contentStyle={tooltipStyle}
                      />
                      <Bar dataKey="total" fill="url(#gradZona)" radius={[0, 8, 8, 0]} barSize={26}>
                        <LabelList
                          dataKey="total"
                          position="right"
                          offset={8}
                          formatter={(v: number) => v.toLocaleString('pt-BR')}
                          style={{ fontSize: 13, fontWeight: 600, fill: chartLabel }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  Exibindo as {Math.min(10, zonasFiltradas.length)} zonas/seções com mais eleitores{buscaZona ? ' (busca aplicada)' : ''}
                </p>
              </div>
            ) : (
            <div ref={setupHorizontalScroll}>
              <table style={{ minWidth: '1200px', width: '100%' }}>
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-2 text-gray-900 dark:text-white">Zona</th>
                    <th className="text-left py-2 text-gray-900 dark:text-white">Seção</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white">Total</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white">%</th>
                    <th className="px-4 py-2 text-gray-900 dark:text-white">Progresso</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Novos (Mês)</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Cresc. Mensal</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Novos (Ano)</th>
                    <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Cresc. Anual</th>
                    <th className="text-center py-2 text-gray-900 dark:text-white">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedData(zonasFiltradas, zonaPage).map((item, index, arr) => {
                    const percentage = (item.total / stats.totalEleitores) * 100;
                    const zonaSecaoKey = `${item.zona}-${item.secao}`;
                    const crescimento = crescimentoZonasSecoes.find(c => c.zona === item.zona && c.secao === item.secao);
                    // Nas últimas linhas o menu abre para cima para não ficar escondido atrás do próximo card
                    const abreParaCima = index >= arr.length - 2;
                    return (
                      <tr key={zonaSecaoKey} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${index === 0 ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                        <td className="py-2 text-gray-900 dark:text-white font-medium">{item.zona}</td>
                        <td className="py-2 text-gray-900 dark:text-white font-medium">{item.secao}</td>
                        <td className="text-right py-2 text-gray-900 dark:text-white">{item.total}</td>
                        <td className="text-right py-2 text-gray-900 dark:text-white">{percentage.toFixed(1)}%</td>
                        <td className="px-4 py-2">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-blue-400'}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </td>
                        
                        {/* Novos no Mês */}
                        <td className="text-right py-2 text-xs">
                          {crescimento ? (
                            <>
                              <span className="text-gray-900 dark:text-white font-medium">
                                {crescimento.novos_mes_atual}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 ml-1">
                                (vs {crescimento.novos_mes_anterior})
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        
                        {/* Crescimento Mensal */}
                        <td className="text-right py-2 text-xs">
                          {crescimento ? (
                            <div className="flex items-center justify-end gap-1">
                              {crescimento.crescimento_mensal > 0 ? (
                                <TrendingUp className="w-3 h-3 text-green-600" />
                              ) : crescimento.crescimento_mensal < 0 ? (
                                <TrendingDown className="w-3 h-3 text-red-600" />
                              ) : null}
                              <span className={`font-medium ${
                                crescimento.crescimento_mensal > 0 ? 'text-green-600 dark:text-green-400' :
                                crescimento.crescimento_mensal < 0 ? 'text-red-600 dark:text-red-400' :
                                'text-gray-600 dark:text-gray-400'
                              }`}>
                                {crescimento.crescimento_mensal > 0 ? '+' : ''}{crescimento.crescimento_mensal}
                                ({crescimento.crescimento_mensal_percentual > 0 ? '+' : ''}{crescimento.crescimento_mensal_percentual.toFixed(0)}%)
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        
                        {/* Novos no Ano */}
                        <td className="text-right py-2 text-xs">
                          {crescimento ? (
                            <>
                              <span className="text-gray-900 dark:text-white font-medium">
                                {crescimento.novos_ano_atual}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 ml-1">
                                (vs {crescimento.novos_ano_anterior})
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        
                        {/* Crescimento Anual */}
                        <td className="text-right py-2 text-xs">
                          {crescimento ? (
                            <div className="flex items-center justify-end gap-1">
                              {crescimento.crescimento_anual > 0 ? (
                                <TrendingUp className="w-3 h-3 text-green-600" />
                              ) : crescimento.crescimento_anual < 0 ? (
                                <TrendingDown className="w-3 h-3 text-red-600" />
                              ) : null}
                              <span className={`font-medium ${
                                crescimento.crescimento_anual > 0 ? 'text-green-600 dark:text-green-400' :
                                crescimento.crescimento_anual < 0 ? 'text-red-600 dark:text-red-400' :
                                'text-gray-600 dark:text-gray-400'
                              }`}>
                                {crescimento.crescimento_anual > 0 ? '+' : ''}{crescimento.crescimento_anual}
                                ({crescimento.crescimento_anual_percentual > 0 ? '+' : ''}{crescimento.crescimento_anual_percentual.toFixed(0)}%)
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="relative flex items-center justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuZona(openMenuZona === zonaSecaoKey ? null : zonaSecaoKey);
                              }}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Opções de exportação"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                            
                            {openMenuZona === zonaSecaoKey && (
                              <div 
                                className={`absolute right-0 ${abreParaCima ? 'bottom-8' : 'top-8'} z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportZonaExcel(item.zona, item.secao);
                                    setOpenMenuZona(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                >
                                  <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <span>Excel</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportZonaPDF(item.zona, item.secao);
                                    setOpenMenuZona(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                >
                                  <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                                  <span>PDF</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
            {zonaView === 'tabela' && (
              <TablePagination
                currentPage={zonaPage}
                totalItems={zonasFiltradas.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setZonaPage}
              />
            )}
          </Card>

          {/* Top 5 Eleitores com Mais Atendimentos */}
          <Card id="secao-atendimentos" className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Users2 className="w-5 h-5 text-gray-900 dark:text-white" />
                  Top 20 Eleitores - Atendimentos
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Eleitores com maior número de atendimentos registrados</p>
              </div>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shrink-0">
                <button
                  onClick={() => setTopEleitoresView('tabela')}
                  className={`p-1.5 transition-colors ${topEleitoresView === 'tabela' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  title="Visualizar tabela"
                >
                  <Table2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTopEleitoresView('grafico')}
                  className={`p-1.5 transition-colors ${topEleitoresView === 'grafico' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  title="Visualizar gráfico"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {topEleitoresView === 'grafico' ? (
              <div className="w-full">
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(stats.topEleitoresAtendimentos || []).slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 5, right: 70, left: 10, bottom: 5 }}
                      barCategoryGap="30%"
                    >
                      <defs>
                        <linearGradient id="gradTopEleitores" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#d946ef" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartGrid} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="eleitor_nome"
                        width={170}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: chartTick }}
                        tickFormatter={(v: string) => v.length > 24 ? v.slice(0, 24) + '…' : v}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(139,92,246,0.08)' }}
                        formatter={(value: number) => [`${value} atendimentos`, 'Total']}
                        contentStyle={tooltipStyle}
                      />
                      <Bar dataKey="total_atendimentos" fill="url(#gradTopEleitores)" radius={[0, 8, 8, 0]} barSize={26}>
                        <LabelList
                          dataKey="total_atendimentos"
                          position="right"
                          offset={8}
                          formatter={(v: number) => v.toLocaleString('pt-BR')}
                          style={{ fontSize: 13, fontWeight: 600, fill: chartLabel }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  Exibindo os {Math.min(10, stats.topEleitoresAtendimentos?.length || 0)} eleitores com mais atendimentos
                </p>
              </div>
            ) : (
            <div ref={setupHorizontalScroll}>
                <table style={{ minWidth: '600px', width: '100%' }}>
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-2 w-1/3 text-gray-900 dark:text-white">Eleitor</th>
                      <th className="text-right py-2 w-1/4 text-gray-900 dark:text-white">WhatsApp</th>
                      <th className="text-right py-2 w-20 text-gray-900 dark:text-white">Total</th>
                      <th className="px-4 py-2 w-1/4 text-gray-900 dark:text-white">Progresso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(stats.topEleitoresAtendimentos, topEleitoresPage).map((eleitor, index) => {
                      const maxAtendimentos = stats.topEleitoresAtendimentos[0]?.total_atendimentos || 1;

                      return (
                        <tr key={`${eleitor.uid || eleitor.eleitor_nome}-${index}`} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="py-2 truncate">
                            <div className="flex items-center gap-2">
                              <Link 
                                to={`/app/pessoas/${eleitor.uid}`} 
                                className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-primary dark:hover:text-primary"
                              >
                                <UserCircle2 className="w-5 h-5 text-primary dark:text-primary" />
                                {eleitor.eleitor_nome}
                              </Link>
                            </div>
                          </td>
                          <td className="text-right py-2 font-mono text-gray-500 dark:text-gray-400 tracking-wider">{eleitor.whatsapp || '-'}</td>
                          <td className="text-right py-2 font-semibold text-primary-600 dark:text-primary-400">{eleitor.total_atendimentos}</td>
                          <td className="px-4 py-2">
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                              <div
                                className="h-2.5 rounded-full bg-blue-600"
                                style={{ 
                                  width: `${Math.min((eleitor.total_atendimentos / maxAtendimentos) * 70, 70)}%`,
                                  opacity: 0.6
                                }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
            )}
            {topEleitoresView === 'tabela' && (
              <TablePagination
                currentPage={topEleitoresPage}
                totalItems={stats.topEleitoresAtendimentos?.length || 0}
                itemsPerPage={itemsPerPage}
                onPageChange={setTopEleitoresPage}
              />
            )}
          </Card>

          {/* Tabela de Confiabilidade */}
          <Card id="secao-confiabilidade" className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Confiabilidade do Voto
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total: {stats.porConfiabilidade.length} níveis • Análise de crescimento mensal e anual
                </p>
              </div>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shrink-0">
                <button
                  onClick={() => setConfiabilidadeView('tabela')}
                  className={`p-1.5 transition-colors ${confiabilidadeView === 'tabela' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  title="Visualizar tabela"
                >
                  <Table2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfiabilidadeView('grafico')}
                  className={`p-1.5 transition-colors ${confiabilidadeView === 'grafico' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  title="Visualizar gráfico"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cards de Destaques de Crescimento */}
            {!loadingCrescimentoConfiabilidade && crescimentoConfiabilidade.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Maior Crescimento Anual
                    </span>
                  </div>
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    {crescimentoConfiabilidade[0]?.confiabilidade || '-'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    +{crescimentoConfiabilidade[0]?.crescimento_anual_percentual.toFixed(1)}% 
                    ({crescimentoConfiabilidade[0]?.crescimento_anual > 0 ? '+' : ''}{crescimentoConfiabilidade[0]?.crescimento_anual})
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Maior Crescimento Mensal
                    </span>
                  </div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {[...crescimentoConfiabilidade].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.confiabilidade || '-'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    +{[...crescimentoConfiabilidade].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal_percentual.toFixed(1)}%
                    ({[...crescimentoConfiabilidade].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal > 0 ? '+' : ''}{[...crescimentoConfiabilidade].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal})
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Users2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Novos Este Ano
                    </span>
                  </div>
                  <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {crescimentoConfiabilidade.reduce((sum, c) => sum + c.novos_ano_atual, 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    vs {crescimentoConfiabilidade.reduce((sum, c) => sum + c.novos_ano_anterior, 0).toLocaleString()} ano anterior
                  </div>
                </div>
              </div>
            )}
            {confiabilidadeView === 'grafico' ? (
              <div className="w-full">
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.porConfiabilidade || []}
                        dataKey="total"
                        nameKey="confiabilidade"
                        cx="50%"
                        cy="50%"
                        innerRadius="52%"
                        outerRadius="80%"
                        paddingAngle={3}
                        strokeWidth={0}
                        label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                        fontSize={13}
                      >
                        {(stats.porConfiabilidade || []).map((_, i) => (
                          <Cell
                            key={i}
                            fill={['#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#9ca3af'][i % 8]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value.toLocaleString('pt-BR')} eleitores`, name]}
                        contentStyle={tooltipStyle}
                      />
                      <Legend formatter={(v: string) => <span className="text-sm text-gray-700 dark:text-gray-300">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  Participação de cada nível de confiabilidade no total de eleitores
                </p>
              </div>
            ) : (
            <div ref={setupHorizontalScroll}>
                <table style={{ minWidth: '1200px', width: '100%' }}>
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-2 text-gray-900 dark:text-white">Nível</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white">Total</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white">%</th>
                      <th className="px-4 py-2 text-gray-900 dark:text-white">Progresso</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Novos (Mês)</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Cresc. Mensal</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Novos (Ano)</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Cresc. Anual</th>
                      <th className="text-center py-2 text-gray-900 dark:text-white">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(stats.porConfiabilidade, confiabilidadePage).map(({ confiabilidade, total }, index, arr) => {
                      const percentage = (total / stats.totalEleitores) * 100;
                      // Nas últimas linhas o menu abre para cima para não ficar escondido atrás do próximo card
                      const abreParaCima = index >= arr.length - 2;
                      const config = confiabilidadeConfig[confiabilidade as keyof typeof confiabilidadeConfig] || {
                        color: 'bg-gray-400',
                        icon: '❓',
                        description: 'Não definido'
                      };
                      const crescimento = crescimentoConfiabilidade.find(c => c.confiabilidade === confiabilidade);
                      
                      return (
                        <tr key={confiabilidade} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="py-2 flex items-center gap-2 text-gray-900 dark:text-white font-medium">
                            <span>{config.icon}</span>
                            {confiabilidade}
                          </td>
                          <td className="text-right py-2 text-gray-900 dark:text-white">{total}</td>
                          <td className="text-right py-2 text-gray-900 dark:text-white">{percentage.toFixed(1)}%</td>
                          <td className="px-4 py-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                              <div
                                className="h-2.5 rounded-full bg-blue-600"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </td>
                          
                          {/* Novos no Mês */}
                          <td className="text-right py-2 text-xs">
                            {crescimento ? (
                              <>
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {crescimento.novos_mes_atual}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 ml-1">
                                  (vs {crescimento.novos_mes_anterior})
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          
                          {/* Crescimento Mensal */}
                          <td className="text-right py-2 text-xs">
                            {crescimento ? (
                              <div className="flex items-center justify-end gap-1">
                                {crescimento.crescimento_mensal > 0 ? (
                                  <TrendingUp className="w-3 h-3 text-green-600" />
                                ) : crescimento.crescimento_mensal < 0 ? (
                                  <TrendingDown className="w-3 h-3 text-red-600" />
                                ) : null}
                                <span className={`font-medium ${
                                  crescimento.crescimento_mensal > 0 ? 'text-green-600 dark:text-green-400' :
                                  crescimento.crescimento_mensal < 0 ? 'text-red-600 dark:text-red-400' :
                                  'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {crescimento.crescimento_mensal > 0 ? '+' : ''}{crescimento.crescimento_mensal}
                                  ({crescimento.crescimento_mensal_percentual > 0 ? '+' : ''}{crescimento.crescimento_mensal_percentual.toFixed(0)}%)
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          
                          {/* Novos no Ano */}
                          <td className="text-right py-2 text-xs">
                            {crescimento ? (
                              <>
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {crescimento.novos_ano_atual}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 ml-1">
                                  (vs {crescimento.novos_ano_anterior})
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          
                          {/* Crescimento Anual */}
                          <td className="text-right py-2 text-xs">
                            {crescimento ? (
                              <div className="flex items-center justify-end gap-1">
                                {crescimento.crescimento_anual > 0 ? (
                                  <TrendingUp className="w-3 h-3 text-green-600" />
                                ) : crescimento.crescimento_anual < 0 ? (
                                  <TrendingDown className="w-3 h-3 text-red-600" />
                                ) : null}
                                <span className={`font-medium ${
                                  crescimento.crescimento_anual > 0 ? 'text-green-600 dark:text-green-400' :
                                  crescimento.crescimento_anual < 0 ? 'text-red-600 dark:text-red-400' :
                                  'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {crescimento.crescimento_anual > 0 ? '+' : ''}{crescimento.crescimento_anual}
                                  ({crescimento.crescimento_anual_percentual > 0 ? '+' : ''}{crescimento.crescimento_anual_percentual.toFixed(0)}%)
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-2">
                            <div className="relative flex items-center justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuConfiabilidade(openMenuConfiabilidade === confiabilidade ? null : confiabilidade);
                                }}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                title="Opções de exportação"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                              </button>
                              
                              {openMenuConfiabilidade === confiabilidade && (
                                <div 
                                  className={`absolute right-0 ${abreParaCima ? 'bottom-8' : 'top-8'} z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportConfiabilidadeExcel(confiabilidade);
                                      setOpenMenuConfiabilidade(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                  >
                                    <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span>Excel</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportConfiabilidadePDF(confiabilidade);
                                      setOpenMenuConfiabilidade(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                  >
                                    <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                                    <span>PDF</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
            )}
            {confiabilidadeView === 'tabela' && (
              <TablePagination
                currentPage={confiabilidadePage}
                totalItems={stats.porConfiabilidade?.length || 0}
                itemsPerPage={itemsPerPage}
                onPageChange={setConfiabilidadePage}
              />
            )}
          </Card>

          {/* Aniversariantes do Mês */}
          <Card id="secao-aniversariantes" className="p-4 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Cake className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  Aniversariantes do Mês
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Visualize todos os aniversariantes do mês selecionado</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm flex-1 sm:flex-initial bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                {aniversariantes.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuAniversariante(!openMenuAniversariante);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Exportar aniversariantes"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    
                    {openMenuAniversariante && (
                      <div 
                        className="absolute right-0 top-10 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportAniversariantesExcel();
                            setOpenMenuAniversariante(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span>Excel</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportAniversariantesPDF();
                            setOpenMenuAniversariante(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                        >
                          <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span>PDF</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {loadingAniversariantes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : aniversariantes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Cake className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p>Nenhum aniversariante encontrado para este mês</p>
              </div>
            ) : (
              <>
                {/* Mini gráfico: distribuição de aniversariantes por dia do mês */}
                {aniversariantesPorDia.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Distribuição por dia do mês
                    </p>
                    <div className="h-[160px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={aniversariantesPorDia} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
                          <XAxis
                            dataKey="dia"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10, fill: chartTick }}
                            interval="preserveStartEnd"
                          />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: chartTick }} width={30} />
                          <Tooltip
                            formatter={(value: number) => [`${value} aniversariante${value > 1 ? 's' : ''}`, 'Total']}
                            labelFormatter={(label) => `Dia ${label}`}
                            contentStyle={tooltipStyle}
                          />
                          <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {generoFilter !== 'all' && (
                  <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg flex flex-row items-center justify-between gap-2">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      <span className="font-semibold">Filtro ativo:</span> {
                        generoFilter === 'MASCULINO' ? 'Masculino' : 
                        generoFilter === 'FEMININO' ? 'Feminino' : 
                        generoFilter === 'hoje' ? 'Aniversariantes de Hoje' :
                        generoFilter === '7dias' ? 'Últimos 7 dias' :
                        'Últimos 15 dias'
                      }
                    </p>
                    <button
                      onClick={() => {
                        setGeneroFilter('all');
                        setAniversariantesPage(1);
                      }}
                      className="text-xs text-yellow-800 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-200 underline whitespace-nowrap flex-shrink-0"
                    >
                      Limpar filtro
                    </button>
                  </div>
                )}
                
                {/* Filtro de Período - Dropdown */}
                <div className="mb-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Filtrar por período:
                  </label>
                  <select
                    value={generoFilter === '7dias' ? '7dias' : generoFilter === '15dias' ? '15dias' : 'all'}
                    onChange={(e) => {
                      setGeneroFilter(e.target.value as any);
                      setAniversariantesPage(1);
                    }}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="all">Todos do mês</option>
                    <option value="7dias">Últimos 7 dias</option>
                    <option value="15dias">Últimos 15 dias</option>
                  </select>
                </div>
                
                <div className={`mb-3 grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 ${
                  (() => {
                    const today = new Date();
                    const todayDay = today.getDate();
                    const todayMonth = today.getMonth() + 1;
                    const selectedMonthNum = parseInt(selectedMonth.split('-')[1]);
                    
                    if (selectedMonthNum === todayMonth) {
                      const aniversariantesHoje = aniversariantes.filter(e => {
                        const [, , d] = e.nascimento.split('-').map(Number);
                        return d === todayDay;
                      });
                      
                      if (aniversariantesHoje.length > 0) {
                        return 'lg:grid-cols-4';
                      }
                    }
                    return 'lg:grid-cols-3';
                  })()
                }`}>
                  <button
                    onClick={() => {
                      setGeneroFilter('all');
                      setAniversariantesPage(1);
                    }}
                    className={`p-3 sm:p-4 rounded-lg text-left transition-all hover:shadow-md cursor-pointer ${
                      generoFilter === 'all' ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500 dark:ring-blue-400' : 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                    }`}
                  >
                    <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-300 font-medium mb-1">Total</p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-200">{aniversariantes.length}</p>
                  </button>
                  
                  {/* Card de Aniversariantes de Hoje - Aparece após Total */}
                  {(() => {
                    const today = new Date();
                    const todayDay = today.getDate();
                    const todayMonth = today.getMonth() + 1;
                    const selectedMonthNum = parseInt(selectedMonth.split('-')[1]);
                    
                    if (selectedMonthNum === todayMonth) {
                      const aniversariantesHoje = aniversariantes.filter(e => {
                        const [, , d] = e.nascimento.split('-').map(Number);
                        return d === todayDay;
                      });
                      
                      if (aniversariantesHoje.length > 0) {
                        return (
                          <button
                            onClick={() => {
                              setGeneroFilter('hoje');
                              setAniversariantesPage(1);
                            }}
                            className={`p-3 sm:p-4 rounded-lg text-left transition-all hover:shadow-lg cursor-pointer border-2 ${
                              generoFilter === 'hoje' 
                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 border-green-500 dark:border-green-400 ring-2 ring-green-300 dark:ring-green-600' 
                                : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-300 dark:border-green-600 hover:border-green-400 dark:hover:border-green-500'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1.5 bg-green-500 rounded-full flex-shrink-0">
                                <Cake className="w-4 h-4 text-white" />
                              </div>
                              <p className="text-xs font-medium text-green-700 dark:text-green-300">🎉 Aniversariantes Hoje</p>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <p className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-200">{aniversariantesHoje.length}</p>
                              <p className="text-xs text-green-600 dark:text-green-400">
                                {aniversariantesHoje.length === 1 ? 'pessoa' : 'pessoas'}
                              </p>
                            </div>
                          </button>
                        );
                      }
                    }
                    return null;
                  })()}
                  <button
                    onClick={() => {
                      setGeneroFilter('MASCULINO');
                      setAniversariantesPage(1);
                    }}
                    className={`p-3 sm:p-4 rounded-lg text-left transition-all hover:shadow-md cursor-pointer ${
                      generoFilter === 'MASCULINO' ? 'bg-cyan-100 dark:bg-cyan-900/50 ring-2 ring-cyan-500 dark:ring-cyan-400' : 'bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/40'
                    }`}
                  >
                    <p className="text-xs sm:text-sm text-cyan-600 dark:text-cyan-300 font-medium mb-1">Masculino</p>
                    <p className="text-2xl sm:text-3xl font-bold text-cyan-700 dark:text-cyan-200">
                      {aniversariantes.filter(e => e.genero?.toUpperCase() === 'MASCULINO').length}
                    </p>
                  </button>
                  <button
                    onClick={() => {
                      setGeneroFilter('FEMININO');
                      setAniversariantesPage(1);
                    }}
                    className={`p-3 sm:p-4 rounded-lg text-left transition-all hover:shadow-md cursor-pointer ${
                      generoFilter === 'FEMININO' ? 'bg-pink-100 dark:bg-pink-900/50 ring-2 ring-pink-500 dark:ring-pink-400' : 'bg-pink-50 dark:bg-pink-900/30 hover:bg-pink-100 dark:hover:bg-pink-900/40'
                    }`}
                  >
                    <p className="text-xs sm:text-sm text-pink-600 dark:text-pink-300 font-medium mb-1">Feminino</p>
                    <p className="text-2xl sm:text-3xl font-bold text-pink-700 dark:text-pink-200">
                      {aniversariantes.filter(e => e.genero?.toUpperCase() === 'FEMININO').length}
                    </p>
                  </button>
                </div>
                <div 
                  ref={(el) => {
                    if (el) {
                      el.style.cssText = 'overflow-x: scroll; overflow-y: visible; -webkit-overflow-scrolling: touch; width: 100%; position: relative;';
                      
                      // Controle de scroll com detecção de direção
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
                        
                        // Detecta se é scroll horizontal ou vertical
                        if (!isHorizontalScroll && deltaX < 10 && deltaY < 10) {
                          return; // Movimento muito pequeno, ignora
                        }
                        
                        if (!isHorizontalScroll) {
                          isHorizontalScroll = deltaX > deltaY;
                        }
                        
                        // Só previne default se for scroll horizontal
                        if (isHorizontalScroll) {
                          e.preventDefault();
                          const walk = (x - startX) * 2;
                          el.scrollLeft = scrollLeft - walk;
                        }
                      }, { passive: false });
                    }
                  }}
                >
                  <table style={{ minWidth: '700px', width: '100%', borderCollapse: 'collapse', userSelect: 'none' }}>
                      <thead>
                        <tr className="border-b dark:border-gray-700">
                          <th className="text-left py-2 px-2 text-gray-900 dark:text-white" style={{ width: '64px' }}>Dia</th>
                          <th className="text-left py-2 px-2 text-gray-900 dark:text-white" style={{ minWidth: '150px' }}>Nome</th>
                          <th className="text-left py-2 px-2 text-gray-900 dark:text-white" style={{ width: '128px' }}>Nascimento</th>
                          <th className="text-center py-2 px-2 text-gray-900 dark:text-white" style={{ width: '80px' }}>Idade</th>
                          <th className="text-center py-2 px-2 text-gray-900 dark:text-white" style={{ width: '80px' }}>Gênero</th>
                          <th className="text-left py-2 px-2 text-gray-900 dark:text-white" style={{ minWidth: '120px' }}>Contato</th>
                          <th className="text-left py-2 px-2 text-gray-900 dark:text-white" style={{ minWidth: '120px' }}>Bairro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Filtrar por gênero
                          let filteredAniversariantes = aniversariantes;
                          if (generoFilter === 'MASCULINO') {
                            filteredAniversariantes = aniversariantes.filter(e => e.genero?.toUpperCase() === 'MASCULINO');
                          } else if (generoFilter === 'FEMININO') {
                            filteredAniversariantes = aniversariantes.filter(e => e.genero?.toUpperCase() === 'FEMININO');
                          } else if (generoFilter === 'hoje') {
                            const today = new Date();
                            const todayDay = today.getDate();
                            filteredAniversariantes = aniversariantes.filter(e => {
                              const [, , d] = e.nascimento.split('-').map(Number);
                              return d === todayDay;
                            });
                          } else if (generoFilter === '7dias') {
                            const today = new Date();
                            const todayDay = today.getDate();
                            const startDay = Math.max(1, todayDay - 7);
                            filteredAniversariantes = aniversariantes.filter(e => {
                              const [, , d] = e.nascimento.split('-').map(Number);
                              return d >= startDay && d <= todayDay;
                            });
                          } else if (generoFilter === '15dias') {
                            const today = new Date();
                            const todayDay = today.getDate();
                            const startDay = Math.max(1, todayDay - 15);
                            filteredAniversariantes = aniversariantes.filter(e => {
                              const [, , d] = e.nascimento.split('-').map(Number);
                              return d >= startDay && d <= todayDay;
                            });
                          }
                          
                          return getPaginatedData(filteredAniversariantes, aniversariantesPage).map((eleitor, index) => {
                          const [y, m, d] = eleitor.nascimento.split('-').map(Number);
                          const birthDate = new Date(y, m - 1, d);
                          const day = birthDate.getDate();
                          const age = new Date().getFullYear() - birthDate.getFullYear();
                          
                          // Verificar se é aniversário hoje
                          const today = new Date();
                          const isToday = today.getDate() === day && (today.getMonth() + 1) === parseInt(selectedMonth.split('-')[1]);
                          
                          return (
                            <tr key={eleitor.uid} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${isToday ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                              <td className="py-3 px-2">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                                  isToday ? 'bg-blue-500 dark:bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-500' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                }`}>
                                  {day}
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                <Link 
                                  to={`/app/pessoas/${eleitor.uid}`} 
                                  className="text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                                >
                                  {eleitor.nome}
                                </Link>
                              </td>
                              <td className="py-3 px-2 text-xs text-gray-600 dark:text-gray-400">
                                {birthDate.toLocaleDateString('pt-BR')}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                                  {age}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-center">
                                {eleitor.genero?.toUpperCase() === 'MASCULINO' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300">
                                    ♂
                                  </span>
                                ) : eleitor.genero?.toUpperCase() === 'FEMININO' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-300">
                                    ♀
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-xs text-gray-600 dark:text-gray-400">
                                {eleitor.whatsapp || eleitor.telefone || '-'}
                              </td>
                              <td className="py-3 px-2 text-xs text-gray-600 dark:text-gray-400">
                                {eleitor.bairro || '-'}
                              </td>
                            </tr>
                          );
                        });
                        })()}
                      </tbody>
                    </table>
                </div>
                <TablePagination
                  currentPage={aniversariantesPage}
                  totalItems={(() => {
                    if (generoFilter === 'MASCULINO') {
                      return aniversariantes.filter(e => e.genero?.toUpperCase() === 'MASCULINO').length;
                    } else if (generoFilter === 'FEMININO') {
                      return aniversariantes.filter(e => e.genero?.toUpperCase() === 'FEMININO').length;
                    } else if (generoFilter === 'hoje') {
                      const today = new Date();
                      const todayDay = today.getDate();
                      return aniversariantes.filter(e => {
                        const [, , d] = e.nascimento.split('-').map(Number);
                        return d === todayDay;
                      }).length;
                    } else if (generoFilter === '7dias') {
                      const today = new Date();
                      const todayDay = today.getDate();
                      const startDay = Math.max(1, todayDay - 7);
                      return aniversariantes.filter(e => {
                        const [, , d] = e.nascimento.split('-').map(Number);
                        return d >= startDay && d <= todayDay;
                      }).length;
                    } else if (generoFilter === '15dias') {
                      const today = new Date();
                      const todayDay = today.getDate();
                      const startDay = Math.max(1, todayDay - 15);
                      return aniversariantes.filter(e => {
                        const [, , d] = e.nascimento.split('-').map(Number);
                        return d >= startDay && d <= todayDay;
                      }).length;
                    }
                    return aniversariantes.length;
                  })()}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setAniversariantesPage}
                />
              </>
            )}
          </Card>

          {/* Tabela de Usuários */}
          <Card id="secao-usuarios" className="p-4 mb-8 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Cadastros por Usuário
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total: {stats.porUsuario.length} usuários ativos • Análise de crescimento mensal e anual
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shrink-0">
                  <button
                    onClick={() => setUsuarioView('tabela')}
                    className={`p-1.5 transition-colors ${usuarioView === 'tabela' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Visualizar tabela"
                  >
                    <Table2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setUsuarioView('grafico')}
                    className={`p-1.5 transition-colors ${usuarioView === 'grafico' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Visualizar gráfico"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={buscaUsuario}
                    onChange={(e) => { setBuscaUsuario(e.target.value); setUsuarioPage(1); }}
                    placeholder="Buscar usuário..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Cards de Destaques de Crescimento */}
            {!loadingCrescimentoUsuarios && crescimentoUsuarios.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Maior Crescimento Anual
                    </span>
                  </div>
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    {crescimentoUsuarios[0]?.usuario_nome || '-'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    +{crescimentoUsuarios[0]?.crescimento_anual_percentual.toFixed(1)}% 
                    ({crescimentoUsuarios[0]?.crescimento_anual > 0 ? '+' : ''}{crescimentoUsuarios[0]?.crescimento_anual})
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Maior Crescimento Mensal
                    </span>
                  </div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {[...crescimentoUsuarios].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.usuario_nome || '-'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    +{[...crescimentoUsuarios].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal_percentual.toFixed(1)}%
                    ({[...crescimentoUsuarios].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal > 0 ? '+' : ''}{[...crescimentoUsuarios].sort((a, b) => b.crescimento_mensal_percentual - a.crescimento_mensal_percentual)[0]?.crescimento_mensal})
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Users2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Novos Este Ano
                    </span>
                  </div>
                  <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {crescimentoUsuarios.reduce((sum, c) => sum + c.novos_ano_atual, 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    vs {crescimentoUsuarios.reduce((sum, c) => sum + c.novos_ano_anterior, 0).toLocaleString()} ano anterior
                  </div>
                </div>
              </div>
            )}
            {usuarioView === 'grafico' ? (
              <div className="w-full">
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={usuariosFiltrados.slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 5, right: 70, left: 10, bottom: 5 }}
                      barCategoryGap="30%"
                    >
                      <defs>
                        <linearGradient id="gradUsuario" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#f97316" />
                          <stop offset="100%" stopColor="#eab308" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartGrid} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="usuario_nome"
                        width={170}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 13, fill: chartTick }}
                        tickFormatter={(v: string) => v.length > 24 ? v.slice(0, 24) + '…' : v}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(249,115,22,0.08)' }}
                        formatter={(value: number) => [`${value.toLocaleString('pt-BR')} cadastros`, 'Total']}
                        contentStyle={tooltipStyle}
                      />
                      <Bar dataKey="total" fill="url(#gradUsuario)" radius={[0, 8, 8, 0]} barSize={26}>
                        <LabelList
                          dataKey="total"
                          position="right"
                          offset={8}
                          formatter={(v: number) => v.toLocaleString('pt-BR')}
                          style={{ fontSize: 13, fontWeight: 600, fill: chartLabel }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  Exibindo os {Math.min(10, usuariosFiltrados.length)} usuários com mais cadastros{buscaUsuario ? ' (busca aplicada)' : ''}
                </p>
              </div>
            ) : (
            <div ref={setupHorizontalScroll}>
                <table style={{ minWidth: '1200px', width: '100%' }}>
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-2 text-gray-900 dark:text-white">Usuário</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white">Total</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white">%</th>
                      <th className="px-4 py-2 text-gray-900 dark:text-white">Progresso</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Novos (Mês)</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Cresc. Mensal</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Novos (Ano)</th>
                      <th className="text-right py-2 text-gray-900 dark:text-white text-xs">Cresc. Anual</th>
                      <th className="text-center py-2 text-gray-900 dark:text-white">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(usuariosFiltrados, usuarioPage).map(({ usuario_nome, total }, index, arr) => {
                      const percentage = (total / stats.totalEleitores) * 100;
                      const crescimento = crescimentoUsuarios.find(c => c.usuario_nome === usuario_nome);
                      // Nas últimas linhas o menu abre para cima para não ficar escondido atrás do próximo card
                      const abreParaCima = index >= arr.length - 2;
                      return (
                        <tr key={usuario_nome} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${index === 0 ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                          <td className="py-2 text-gray-900 dark:text-white font-medium">{usuario_nome}</td>
                          <td className="text-right py-2 text-gray-900 dark:text-white">{total}</td>
                          <td className="text-right py-2 text-gray-900 dark:text-white">{percentage.toFixed(1)}%</td>
                          <td className="px-4 py-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-blue-400'}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </td>
                          
                          {/* Novos no Mês */}
                          <td className="text-right py-2 text-xs">
                            {crescimento ? (
                              <>
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {crescimento.novos_mes_atual}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 ml-1">
                                  (vs {crescimento.novos_mes_anterior})
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          
                          {/* Crescimento Mensal */}
                          <td className="text-right py-2 text-xs">
                            {crescimento ? (
                              <div className="flex items-center justify-end gap-1">
                                {crescimento.crescimento_mensal > 0 ? (
                                  <TrendingUp className="w-3 h-3 text-green-600" />
                                ) : crescimento.crescimento_mensal < 0 ? (
                                  <TrendingDown className="w-3 h-3 text-red-600" />
                                ) : null}
                                <span className={`font-medium ${
                                  crescimento.crescimento_mensal > 0 ? 'text-green-600 dark:text-green-400' :
                                  crescimento.crescimento_mensal < 0 ? 'text-red-600 dark:text-red-400' :
                                  'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {crescimento.crescimento_mensal > 0 ? '+' : ''}{crescimento.crescimento_mensal}
                                  ({crescimento.crescimento_mensal_percentual > 0 ? '+' : ''}{crescimento.crescimento_mensal_percentual.toFixed(0)}%)
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          
                          {/* Novos no Ano */}
                          <td className="text-right py-2 text-xs">
                            {crescimento ? (
                              <>
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {crescimento.novos_ano_atual}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 ml-1">
                                  (vs {crescimento.novos_ano_anterior})
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          
                          {/* Crescimento Anual */}
                          <td className="text-right py-2 text-xs">
                            {crescimento ? (
                              <div className="flex items-center justify-end gap-1">
                                {crescimento.crescimento_anual > 0 ? (
                                  <TrendingUp className="w-3 h-3 text-green-600" />
                                ) : crescimento.crescimento_anual < 0 ? (
                                  <TrendingDown className="w-3 h-3 text-red-600" />
                                ) : null}
                                <span className={`font-medium ${
                                  crescimento.crescimento_anual > 0 ? 'text-green-600 dark:text-green-400' :
                                  crescimento.crescimento_anual < 0 ? 'text-red-600 dark:text-red-400' :
                                  'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {crescimento.crescimento_anual > 0 ? '+' : ''}{crescimento.crescimento_anual}
                                  ({crescimento.crescimento_anual_percentual > 0 ? '+' : ''}{crescimento.crescimento_anual_percentual.toFixed(0)}%)
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-2">
                            <div className="relative flex items-center justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuUsuario(openMenuUsuario === usuario_nome ? null : usuario_nome);
                                }}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                title="Opções de exportação"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                              </button>
                              
                              {openMenuUsuario === usuario_nome && (
                                <div 
                                  className={`absolute right-0 ${abreParaCima ? 'bottom-8' : 'top-8'} z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportUsuarioExcel(usuario_nome);
                                      setOpenMenuUsuario(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                  >
                                    <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span>Excel</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportUsuarioPDF(usuario_nome);
                                      setOpenMenuUsuario(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-white"
                                  >
                                    <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                                    <span>PDF</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
            )}
            {usuarioView === 'tabela' && (
              <TablePagination
                currentPage={usuarioPage}
                totalItems={usuariosFiltrados.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setUsuarioPage}
              />
            )}
          </Card>
        </div>

        {/* Botão flutuante: voltar ao topo */}
        {mostrarTopo && (
          <button
            onClick={() => getPageScroller().scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
            title="Voltar ao topo"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
