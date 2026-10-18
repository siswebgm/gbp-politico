import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  Banknote,
  BarChart3,
  Barcode,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supabaseClient } from '../../../lib/supabase';
import { PaymentService } from '../../../services/PaymentService';
import { useToast } from '../../../components/ui/use-toast';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';

interface Empresa {
  uid: string;
  nome: string | null;
  apelido?: string | null;
  cpf_cnpj?: string | null;
  cnpj?: string | null;
  contato?: string | null;
  website?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  status?: string | null;
  ativa?: boolean | null;
  data_expiracao?: string | null;
  dia_vencimento?: number | null;
  created_at?: string;
}

interface Plano {
  id: string;
  nome: string;
  valor: number;
  periodo_dias: number;
  empresa_uid: string | null;
}

interface Assinatura {
  id: string;
  empresa_uid: string;
  plano_id: string | null;
  status: string;
  data_vencimento: string | null;
}

interface Pagamento {
  id: string;
  assinatura_id?: string;
  valor: number;
  tipo_pagamento: string;
  status: 'pending' | 'paid' | 'cancelled' | 'failed' | 'overdue';
  data_vencimento: string | null;
  data_pagamento: string | null;
  gateway_url: string | null;
  created_at?: string;
}

const USUARIO_FOTO_PADRAO =
  'https://studio.gbppolitico.com/storage/v1/object/public/josuelmendes/1778554431048_1778554430731_jmapps.png';

interface EmpresaForm {
  nome: string;
  cpf_cnpj: string;
  contato: string;
  cidade: string;
  estado: string;
  dia_vencimento: string;
  plano_id: string;
  status: string;
  ativa: boolean;
  // Dados do usuário admin (só usados na criação)
  usuario_nome: string;
  usuario_email: string;
  usuario_senha: string;
}

const formVazio: EmpresaForm = {
  nome: '',
  cpf_cnpj: '',
  contato: '',
  cidade: '',
  estado: '',
  dia_vencimento: '20',
  plano_id: '',
  status: 'active',
  ativa: true,
  usuario_nome: 'Josuel Mendes',
  usuario_email: '',
  usuario_senha: '8433135',
};

const statusPagamento: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-800' },
  overdue: { label: 'Vencido', cls: 'bg-red-100 text-red-800' },
  paid: { label: 'Pago', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-600' },
  failed: { label: 'Falhou', cls: 'bg-red-100 text-red-700' },
};

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—';

// Mesma regra do selo 'Bloqueada': status ≠ active ou prazo de prorrogação vencido
const empresaBloqueada = (emp: Empresa) =>
  emp.status !== 'active' ||
  (!!emp.data_expiracao &&
    new Date(emp.data_expiracao).getTime() < Date.now());

function proximoVencimento(dia: number): string {
  const hoje = new Date();
  const d = Math.min(Math.max(dia, 1), 28);
  let venc = new Date(hoje.getFullYear(), hoje.getMonth(), d);
  if (venc <= hoje) venc = new Date(hoje.getFullYear(), hoje.getMonth() + 1, d);
  return venc.toISOString();
}

const PAGE_SIZE = 30;

const inputCls =
  'mt-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white';
const labelCls = 'text-xs font-medium text-gray-600 dark:text-gray-300';

export default function Credenciados() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [pendentesPorEmpresa, setPendentesPorEmpresa] = useState<
    Record<string, number>
  >({});
  const [busca, setBusca] = useState('');
  const [mostrarInativas, setMostrarInativas] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'ativas' | 'bloqueadas'>('todas');
  const [filtroDia, setFiltroDia] = useState<'todos' | number>('todos');

  const [modalEmpresa, setModalEmpresa] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [form, setForm] = useState<EmpresaForm>(formVazio);
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const [modalPagamentos, setModalPagamentos] = useState<Empresa | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loadingPagamentos, setLoadingPagamentos] = useState(false);
  const [verificandoId, setVerificandoId] = useState<string | null>(null);

  const [modalDesbloqueio, setModalDesbloqueio] = useState<Empresa | null>(null);
  const [dataDesbloqueio, setDataDesbloqueio] = useState('');
  const [desbloqueando, setDesbloqueando] = useState(false);

  const [visiveis, setVisiveis] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const [modalBloqueio, setModalBloqueio] = useState<Empresa | null>(null);
  const [motivoBloqueio, setMotivoBloqueio] = useState<'pagamento' | 'inativo'>('pagamento');
  const [bloqueando, setBloqueando] = useState(false);

  // Administração mensal de pagamentos
  const [mesRef, setMesRef] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [pagamentosMes, setPagamentosMes] = useState<Pagamento[]>([]);
  const [filtroPag, setFiltroPag] = useState<'todos' | 'pendente' | 'pago' | 'sem'>('todos');
  // Aba ativa via URL (?aba=pagamentos|relatorio) — permite compartilhar/voltar direto
  type Visao = 'empresas' | 'pagamentos' | 'relatorio';
  const abaParam = searchParams.get('aba');
  const visao: Visao =
    abaParam === 'pagamentos' || abaParam === 'relatorio'
      ? abaParam
      : 'empresas';
  const setVisao = (v: Visao) => {
    const p = new URLSearchParams(searchParams);
    if (v === 'empresas') p.delete('aba');
    else p.set('aba', v);
    setSearchParams(p, { replace: true });
  };

  // Ações rápidas na visão mensal
  const [baixaAlvo, setBaixaAlvo] = useState<{
    emp: Empresa;
    pag: Pagamento | null;
  } | null>(null);
  const [dataBaixa, setDataBaixa] = useState('');
  const [baixando, setBaixando] = useState(false);
  const [gerandoEmpresa, setGerandoEmpresa] = useState<string | null>(null);

  // Relatório: histórico de pagamentos para o gráfico mês a mês
  const [mesesHist, setMesesHist] = useState(1);
  const [pagHist, setPagHist] = useState<Pagamento[]>([]);
  // Relatório do mês (detalhamento por empresa)
  const [mesRel, setMesRel] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [pagRel, setPagRel] = useState<Pagamento[]>([]);

  const planoById = useMemo(
    () => Object.fromEntries(planos.map((p) => [p.id, p])),
    [planos]
  );
  const assinaturaByEmpresa = useMemo(() => {
    const map: Record<string, Assinatura> = {};
    for (const a of assinaturas) map[a.empresa_uid] = a;
    return map;
  }, [assinaturas]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, assRes, planosRes, pagsRes] = await Promise.all([
        supabaseClient.from('gbp_empresas').select('*').order('nome'),
        supabaseClient
          .from('gbp_assinaturas')
          .select('*')
          .order('data_inicio', { ascending: false }),
        supabaseClient
          .from('gbp_planos')
          .select('*')
          .order('valor'),
        supabaseClient
          .from('gbp_pagamentos')
          .select('assinatura_id')
          .in('status', ['pending', 'overdue']),
      ]);

      setEmpresas((empRes.data || []) as Empresa[]);
      setAssinaturas((assRes.data || []) as Assinatura[]);
      setPlanos((planosRes.data || []) as Plano[]);

      const assToEmpresa: Record<string, string> = {};
      (assRes.data || []).forEach((a: any) => {
        assToEmpresa[a.id] = a.empresa_uid;
      });
      const contagem: Record<string, number> = {};
      (pagsRes.data || []).forEach((p: any) => {
        const emp = assToEmpresa[p.assinatura_id];
        if (emp) contagem[emp] = (contagem[emp] || 0) + 1;
      });
      setPendentesPorEmpresa(contagem);
    } catch (e) {
      console.error('Erro ao carregar credenciados:', e);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar as empresas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Busca pagamentos com vencimento no mês selecionado
  const carregarPagamentosMes = useCallback(async () => {
    const [y, m] = mesRef.split('-').map(Number);
    if (!y || !m) return;
    const ini = new Date(y, m - 1, 1).toISOString();
    const fim = new Date(y, m, 1).toISOString();
    const { data, error } = await supabaseClient
      .from('gbp_pagamentos')
      .select('*')
      .gte('data_vencimento', ini)
      .lt('data_vencimento', fim);
    if (error) console.error('Erro pagamentos do mês:', error);
    setPagamentosMes((data || []) as Pagamento[]);
  }, [mesRef]);

  useEffect(() => {
    carregarPagamentosMes();
  }, [carregarPagamentosMes]);

  // Abre o modal de edição quando a URL traz ?editar={uid} (vindo da página de detalhes)
  useEffect(() => {
    const editarUid = searchParams.get('editar');
    if (!editarUid || loading) return;
    const emp = empresas.find((e) => e.uid === editarUid);
    if (emp) {
      abrirEdicao(emp);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, empresas, loading]);

  // Reinicia a paginação ao mudar busca/filtro
  useEffect(() => {
    setVisiveis(PAGE_SIZE);
  }, [busca, mostrarInativas, filtroStatus, filtroDia]);

  // Infinite scroll: sentinela no fim da lista carrega mais itens.
  // Usa listener de scroll no contêiner rolável real (o app rola dentro
  // do Layout, não necessariamente na window) + checagem imediata.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const carregarMais = () => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight + 300) {
        setVisiveis((v) => v + PAGE_SIZE);
      }
    };

    // Descobre o ancestral que de fato rola (overflow-y auto/scroll)
    let scroller: HTMLElement | null = el.parentElement;
    while (scroller) {
      const ov = getComputedStyle(scroller).overflowY;
      if (ov === 'auto' || ov === 'scroll') break;
      scroller = scroller.parentElement;
    }

    scroller?.addEventListener('scroll', carregarMais, { passive: true });
    window.addEventListener('scroll', carregarMais, { passive: true });
    carregarMais(); // checa logo após renderizar

    return () => {
      scroller?.removeEventListener('scroll', carregarMais);
      window.removeEventListener('scroll', carregarMais);
    };
  }, [visiveis, empresas.length]);

  // assinatura_id -> empresa_uid (para cruzar pagamentos com empresas)
  const empresaPorAssinatura = useMemo(() => {
    const map: Record<string, string> = {};
    assinaturas.forEach((a) => {
      map[a.id] = a.empresa_uid;
    });
    return map;
  }, [assinaturas]);

  // Pagamento do mês por empresa (prioriza o pago, senão o mais relevante)
  const pagPorEmpresa = useMemo(() => {
    const map: Record<string, Pagamento> = {};
    pagamentosMes.forEach((p) => {
      const emp = p.assinatura_id ? empresaPorAssinatura[p.assinatura_id] : undefined;
      if (!emp) return;
      const atual = map[emp];
      if (!atual || (atual.status !== 'paid' && p.status === 'paid')) map[emp] = p;
    });
    return map;
  }, [pagamentosMes, empresaPorAssinatura]);

  // Dias de vencimento existentes na base (para o filtro)
  const diasVencimento = useMemo(
    () =>
      [...new Set(empresas.map((e) => Number(e.dia_vencimento) || 20))].sort(
        (a, b) => a - b
      ),
    [empresas]
  );

  // Resumo da carteira: total de clientes ativos e receita mensal pelos planos
  const resumoClientes = useMemo(() => {
    let ativos = 0;
    let comPlano = 0;
    let receitaMensal = 0;
    empresas.forEach((e) => {
      if (e.ativa === false) return;
      ativos++;
      const ass = assinaturaByEmpresa[e.uid];
      const plano = ass?.plano_id ? planoById[ass.plano_id] : null;
      if (plano) {
        comPlano++;
        receitaMensal += Number(plano.valor) || 0;
      }
    });
    return { ativos, comPlano, receitaMensal };
  }, [empresas, assinaturaByEmpresa, planoById]);

  const empresasFiltradas = useMemo(() => {
    const base = mostrarInativas
      ? empresas.filter((e) => e.ativa === false)
      : empresas.filter((e) => e.ativa !== false);
    let lista = base;
    if (filtroStatus === 'bloqueadas')
      lista = lista.filter((e) => empresaBloqueada(e));
    else if (filtroStatus === 'ativas')
      lista = lista.filter((e) => !empresaBloqueada(e));
    if (filtroDia !== 'todos')
      lista = lista.filter(
        (e) => (Number(e.dia_vencimento) || 20) === filtroDia
      );
    const q = busca.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((e) =>
      [e.nome, e.apelido, e.cidade, e.estado, e.cpf_cnpj, e.cnpj]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [empresas, busca, mostrarInativas, filtroStatus, filtroDia]);

  type LinhaPag = { emp: Empresa; pag?: Pagamento; plano: Plano | null; key: 'pago' | 'pendente' | 'sem' };
  const linhasPagBase = useMemo<LinhaPag[]>(
    () =>
      empresasFiltradas.map((emp) => {
        const pag = pagPorEmpresa[emp.uid];
        const ass = assinaturaByEmpresa[emp.uid];
        const plano = ass?.plano_id ? planoById[ass.plano_id] : null;
        const key: LinhaPag['key'] = pag ? (pag.status === 'paid' ? 'pago' : 'pendente') : 'sem';
        return { emp, pag, plano, key };
      }),
    [empresasFiltradas, pagPorEmpresa, assinaturaByEmpresa, planoById]
  );

  const resumoPag = useMemo(() => {
    let pago = 0;
    let pendente = 0;
    let sem = 0;
    let recebido = 0;
    linhasPagBase.forEach((l) => {
      if (l.key === 'pago') {
        pago++;
        recebido += Number(l.pag?.valor) || 0;
      } else if (l.key === 'pendente') {
        pendente++;
      } else {
        sem++;
      }
    });
    return { pago, pendente, sem, recebido };
  }, [linhasPagBase]);

  const linhasPag = useMemo(
    () =>
      linhasPagBase.filter((l) => {
        if (filtroPag === 'todos') return true;
        if (filtroPag === 'pago') return l.key === 'pago';
        if (filtroPag === 'pendente') return l.key === 'pendente';
        return l.key === 'sem';
      }),
    [linhasPagBase, filtroPag]
  );

  // Separa em grupos pelo dia de vencimento (ex.: dia 5 e dia 20)
  const gruposPag = useMemo(() => {
    const map = new Map<number, LinhaPag[]>();
    linhasPag.forEach((l) => {
      const dia = Number(l.emp.dia_vencimento) || 20;
      const arr = map.get(dia) || [];
      arr.push(l);
      map.set(dia, arr);
    });
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([dia, linhas]) => ({
        dia,
        linhas,
        pagos: linhas.filter((l) => l.key === 'pago').length,
        pendentes: linhas.filter((l) => l.key === 'pendente').length,
      }));
  }, [linhasPag]);

  // Histórico de pagamentos dos últimos N meses (relatório)
  useEffect(() => {
    const ini = new Date();
    ini.setDate(1);
    ini.setMonth(ini.getMonth() - (mesesHist - 1));
    ini.setHours(0, 0, 0, 0);
    supabaseClient
      .from('gbp_pagamentos')
      .select('id,assinatura_id,valor,status,data_vencimento')
      .gte('data_vencimento', ini.toISOString())
      .then(({ data, error }) => {
        if (error) console.error('Erro histórico pagamentos:', error);
        setPagHist((data || []) as Pagamento[]);
      });
  }, [mesesHist, pagamentosMes]);

  type MesGrafico = {
    key: string;
    label: string;
    faturado: number;
    recebido: number;
    aberto: number;
    qtdPago: number;
    qtdAberto: number;
    semCobranca: number;
  };

  const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const dadosGrafico = useMemo<MesGrafico[]>(() => {
    const hoje = new Date();
    const meses = Array.from({ length: mesesHist }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - (mesesHist - 1 - i), 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${MESES_ABREV[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        faturado: 0,
        recebido: 0,
        aberto: 0,
        qtdPago: 0,
        qtdAberto: 0,
        empresasComCobranca: new Set<string>(),
      };
    });
    const idx = new Map(meses.map((m, i) => [m.key, i]));
    pagHist.forEach((p) => {
      if (!p.data_vencimento) return;
      const i = idx.get(p.data_vencimento.slice(0, 7));
      if (i === undefined) return;
      const m = meses[i];
      const v = Number(p.valor) || 0;
      m.faturado += v;
      if (p.status === 'paid') {
        m.recebido += v;
        m.qtdPago += 1;
      } else if (p.status === 'pending' || p.status === 'overdue') {
        m.aberto += v;
        m.qtdAberto += 1;
      }
      const emp = p.assinatura_id ? empresaPorAssinatura[p.assinatura_id] : undefined;
      if (emp) m.empresasComCobranca.add(emp);
    });
    const ativas = empresas.filter((e) => e.ativa !== false).length;
    return meses.map(({ empresasComCobranca, ...m }) => ({
      ...m,
      semCobranca: Math.max(ativas - empresasComCobranca.size, 0),
    }));
  }, [pagHist, mesesHist, empresaPorAssinatura, empresas]);

  const totaisGrafico = useMemo(
    () =>
      dadosGrafico.reduce(
        (acc, m) => ({
          faturado: acc.faturado + m.faturado,
          recebido: acc.recebido + m.recebido,
          aberto: acc.aberto + m.aberto,
        }),
        { faturado: 0, recebido: 0, aberto: 0 }
      ),
    [dadosGrafico]
  );

  // Pagamentos do mês selecionado no relatório
  useEffect(() => {
    const [y, m] = mesRel.split('-').map(Number);
    if (!y || !m) return;
    const ini = new Date(y, m - 1, 1).toISOString();
    const fim = new Date(y, m, 1).toISOString();
    supabaseClient
      .from('gbp_pagamentos')
      .select('*')
      .gte('data_vencimento', ini)
      .lt('data_vencimento', fim)
      .then(({ data, error }) => {
        if (error) console.error('Erro pagamentos relatório:', error);
        setPagRel((data || []) as Pagamento[]);
      });
  }, [mesRel, pagamentosMes]);

  type LinhaRel = {
    emp: Empresa;
    pag?: Pagamento;
    valor: number;
    key: 'pago' | 'aberto' | 'sem';
  };

  // Detalhe do mês: pagaram / em aberto / sem cobrança
  const relMes = useMemo(() => {
    const porEmp: Record<string, Pagamento> = {};
    pagRel.forEach((p) => {
      const e = p.assinatura_id ? empresaPorAssinatura[p.assinatura_id] : undefined;
      if (!e) return;
      const at = porEmp[e];
      if (!at || (at.status !== 'paid' && p.status === 'paid')) porEmp[e] = p;
    });
    const linhas: LinhaRel[] = empresas
      .filter((e) => e.ativa !== false)
      .map((emp) => {
        const pag = porEmp[emp.uid];
        const ass = assinaturaByEmpresa[emp.uid];
        const plano = ass?.plano_id ? planoById[ass.plano_id] : null;
        return {
          emp,
          pag,
          valor: pag ? Number(pag.valor) || 0 : Number(plano?.valor) || 0,
          key: pag ? (pag.status === 'paid' ? 'pago' : 'aberto') : 'sem',
        };
      })
      .sort((a, b) =>
        (a.emp.nome || a.emp.apelido || '').localeCompare(
          b.emp.nome || b.emp.apelido || ''
        )
      );
    const soma = (k: LinhaRel['key']) =>
      linhas.filter((l) => l.key === k).reduce((s, l) => s + l.valor, 0);
    return {
      pago: linhas.filter((l) => l.key === 'pago'),
      aberto: linhas.filter((l) => l.key === 'aberto'),
      sem: linhas.filter((l) => l.key === 'sem'),
      totPago: soma('pago'),
      totAberto: soma('aberto'),
      totPrevisto: soma('pago') + soma('aberto') + soma('sem'),
    };
  }, [pagRel, empresas, empresaPorAssinatura, assinaturaByEmpresa, planoById]);

  const abrirNova = () => {
    setEditando(null);
    setForm(formVazio);
    setModalEmpresa(true);
  };

  const abrirEdicao = (emp: Empresa) => {
    const ass = assinaturaByEmpresa[emp.uid];
    setEditando(emp);
    setForm({
      nome: emp.nome || '',
      cpf_cnpj: emp.cpf_cnpj || emp.cnpj || '',
      contato: emp.contato || '',
      cidade: emp.cidade || '',
      estado: emp.estado || '',
      dia_vencimento: String(emp.dia_vencimento || 20),
      plano_id: ass?.plano_id || '',
      status: emp.status || 'active',
      ativa: emp.ativa !== false,
    });
    setModalEmpresa(true);
  };

  const salvarEmpresa = async () => {
    if (!form.nome.trim()) {
      toast({ title: 'Informe o nome da empresa', variant: 'destructive' });
      return;
    }
    setSalvando(true);
    try {
      const dia = Math.min(Math.max(Number(form.dia_vencimento) || 20, 1), 28);
      const payload = {
        nome: form.nome.trim(),
        cpf_cnpj: form.cpf_cnpj.trim() || null,
        contato: form.contato.trim() || null,
        cidade: form.cidade.trim() || null,
        estado: form.estado.trim() || null,
        dia_vencimento: dia,
        status: form.status,
        ativa: form.ativa,
      };

      const isCriandoUsuario =
        !editando && !!form.usuario_email.trim() && !!form.usuario_senha.trim();
      if (isCriandoUsuario && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.usuario_email.trim())) {
        toast({
          title: 'E-mail do usuário inválido',
          variant: 'destructive',
        });
        return;
      }

      let empresaUid = editando?.uid;

      if (editando) {
        const { error } = await supabaseClient
          .from('gbp_empresas')
          .update(payload)
          .eq('uid', editando.uid);
        if (error) throw error;
      } else {
        // id é identity — o banco gera; uid também tem default gen_random_uuid
        const { data, error } = await supabaseClient
          .from('gbp_empresas')
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select('uid')
          .single();
        if (error) throw error;
        empresaUid = data.uid;

        // Cria o usuário admin vinculado à nova empresa
        if (isCriandoUsuario && empresaUid) {
          const { error: userError } = await supabaseClient
            .from('gbp_usuarios')
            .insert({
              nome: (form.usuario_nome.trim() || 'Josuel Mendes').toUpperCase(),
              email: form.usuario_email.trim().toLowerCase(),
              senha: form.usuario_senha.trim(),
              contato: '81979146126',
              foto: USUARIO_FOTO_PADRAO,
              cargo: 'admin',
              nivel_acesso: 'admin',
              adm_empresa: true,
              status: 'active',
              empresa_uid: empresaUid,
              permissoes: [
                'view_projetos_lei',
                'create_projetos_lei',
                'edit_projetos_lei',
                'delete_projetos_lei',
                'view_oficios',
                'create_oficios',
                'edit_oficios',
                'delete_oficios',
                'view_dashboard',
                'manage_users',
                'manage_roles',
                'manage_settings',
              ],
              created_at: new Date().toISOString(),
            });
          if (userError) {
            // rollback: remove a empresa recém-criada para não ficar órfã
            await supabaseClient
              .from('gbp_empresas')
              .delete()
              .eq('uid', empresaUid);
            throw userError;
          }
        }
      }

      if (empresaUid && form.plano_id) {
        const ass = assinaturaByEmpresa[empresaUid];
        if (ass) {
          if (ass.plano_id !== form.plano_id) {
            const { error } = await supabaseClient
              .from('gbp_assinaturas')
              .update({ plano_id: form.plano_id })
              .eq('id', ass.id);
            if (error) throw error;
          }
        } else {
          const venc = proximoVencimento(dia);
          const { error } = await supabaseClient.from('gbp_assinaturas').insert({
            empresa_uid: empresaUid,
            plano_id: form.plano_id,
            status: 'pending',
            data_inicio: new Date().toISOString(),
            data_vencimento: venc,
            data_fim: venc,
            dias_tolerancia: 10,
          });
          if (error) throw error;
        }
      }

      toast({
        title: editando ? 'Empresa atualizada' : 'Empresa criada',
        description: form.plano_id
          ? 'Dados salvos e plano vinculado.'
          : 'Dados salvos.',
      });
      setModalEmpresa(false);
      await carregar();
    } catch (e: any) {
      console.error('Erro ao salvar empresa:', e);
      toast({
        title: 'Erro ao salvar',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSalvando(false);
    }
  };

  const carregarPagamentos = async (emp: Empresa) => {
    setLoadingPagamentos(true);
    try {
      const ass = assinaturaByEmpresa[emp.uid];
      if (!ass) {
        setPagamentos([]);
        return;
      }
      const { data, error } = await supabaseClient
        .from('gbp_pagamentos')
        .select('*')
        .eq('assinatura_id', ass.id)
        .order('data_vencimento', { ascending: false });
      if (error) throw error;
      setPagamentos((data || []) as Pagamento[]);
    } catch (e) {
      console.error('Erro ao carregar pagamentos:', e);
      toast({ title: 'Erro ao carregar pagamentos', variant: 'destructive' });
    } finally {
      setLoadingPagamentos(false);
    }
  };

  const abrirPagamentos = async (emp: Empresa) => {
    setModalPagamentos(emp);
    setPagamentos([]);
    await carregarPagamentos(emp);
  };

  const verificarPagamento = async (pagamentoId: string) => {
    setVerificandoId(pagamentoId);
    try {
      const r = await PaymentService.checkPaymentStatus(pagamentoId);
      toast({
        title: 'Status verificado',
        description: `Status no Asaas: ${r?.statusAsaas || 'desconhecido'}`,
      });
      if (modalPagamentos) await carregarPagamentos(modalPagamentos);
      await carregar();
      await carregarPagamentosMes();
    } catch (e: any) {
      toast({
        title: 'Erro ao verificar',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setVerificandoId(null);
    }
  };

  // Baixa manual: registra valor recebido por outro meio.
  // Com cobrança gerada → baixa via API (informa o Asaas).
  // Sem cobrança → cria o pagamento já como 'paid' no banco.
  const abrirBaixa = (emp: Empresa, pag: Pagamento | null) => {
    setBaixaAlvo({ emp, pag });
    setDataBaixa(new Date().toISOString().slice(0, 10));
  };

  const valorBaixaAlvo = () => {
    if (!baixaAlvo) return 0;
    if (baixaAlvo.pag) return Number(baixaAlvo.pag.valor) || 0;
    const ass = assinaturaByEmpresa[baixaAlvo.emp.uid];
    const plano = ass?.plano_id ? planoById[ass.plano_id] : null;
    return Number(plano?.valor) || 0;
  };

  const confirmarBaixa = async () => {
    if (!baixaAlvo) return;
    setBaixando(true);
    try {
      if (baixaAlvo.pag) {
        await PaymentService.baixarPagamento(
          baixaAlvo.pag.id,
          dataBaixa || undefined
        );
      } else {
        const ass = assinaturaByEmpresa[baixaAlvo.emp.uid];
        if (!ass)
          throw new Error(
            'Empresa sem assinatura. Vincule um plano para registrar a baixa.'
          );
        const [y, m] = mesRef.split('-').map(Number);
        const dia = Number(baixaAlvo.emp.dia_vencimento) || 20;
        const ultimoDia = new Date(y, m, 0).getDate();
        const venc = new Date(y, m - 1, Math.min(dia, ultimoDia), 12);
        const { error } = await supabaseClient.from('gbp_pagamentos').insert({
          assinatura_id: ass.id,
          valor: valorBaixaAlvo(),
          tipo_pagamento: 'outros',
          status: 'paid',
          data_vencimento: venc.toISOString(),
          data_pagamento: new Date(`${dataBaixa}T12:00:00`).toISOString(),
        });
        if (error) throw error;
      }
      toast({
        title: 'Baixa registrada',
        description: 'Valor recebido por outro meio marcado como pago.',
      });
      setBaixaAlvo(null);
      await carregarPagamentosMes();
      await carregar();
    } catch (e: any) {
      toast({
        title: 'Erro ao dar baixa',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setBaixando(false);
    }
  };

  // Gera cobrança PIX para empresa sem cobrança no mês
  const gerarCobrancaPix = async (emp: Empresa) => {
    const ass = assinaturaByEmpresa[emp.uid];
    if (!ass) {
      toast({
        title: 'Empresa sem assinatura',
        description: 'Vincule um plano na edição da empresa primeiro.',
        variant: 'destructive',
      });
      return;
    }
    setGerandoEmpresa(emp.uid);
    try {
      const r = await PaymentService.generatePayment(
        ass.id,
        'pix',
        0,
        emp.cpf_cnpj || undefined,
        emp.dia_vencimento || undefined
      );
      toast({
        title: r?.existing ? 'Já existe cobrança em aberto' : 'Cobrança PIX gerada',
        description: emp.nome || '',
      });
      await carregarPagamentosMes();
      await carregar();
    } catch (e: any) {
      toast({
        title: 'Erro ao gerar cobrança',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setGerandoEmpresa(null);
    }
  };

  const abrirDesbloqueio = (emp: Empresa) => {
    setModalDesbloqueio(emp);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDataDesbloqueio(d.toISOString().slice(0, 10));
  };

  const abrirBloqueio = (emp: Empresa) => {
    setModalBloqueio(emp);
    setMotivoBloqueio('pagamento');
  };

  // Desbloqueio imediato: ativa a empresa sem data de expiração
  const ativarEmpresa = async (emp: Empresa) => {
    try {
      const { error } = await supabaseClient
        .from('gbp_empresas')
        .update({ status: 'active', ativa: true, data_expiracao: null })
        .eq('uid', emp.uid);
      if (error) throw error;
      toast({
        title: 'Empresa ativada',
        description: `${emp.nome} voltou a ter acesso ao sistema.`,
      });
      await carregar();
    } catch (e: any) {
      toast({
        title: 'Erro ao ativar',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const confirmarBloqueio = async () => {
    if (!modalBloqueio) return;
    setBloqueando(true);
    try {
      // pagamento: status 'blocked' → usuário cai em /bloqueado para pagar
      // inativo:  ativa=false + status 'inactive' → /encerrado (vínculo encerrado)
      const patch =
        motivoBloqueio === 'pagamento'
          ? { status: 'blocked' }
          : { ativa: false, status: 'inactive' };
      const { error } = await supabaseClient
        .from('gbp_empresas')
        .update(patch)
        .eq('uid', modalBloqueio.uid);
      if (error) throw error;
      toast({
        title: 'Empresa bloqueada',
        description:
          motivoBloqueio === 'pagamento'
            ? 'Usuários serão direcionados para a página de regularização.'
            : 'Vínculo encerrado — usuários serão direcionados para /encerrado.',
      });
      setModalBloqueio(null);
      await carregar();
    } catch (e: any) {
      toast({
        title: 'Erro ao bloquear',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setBloqueando(false);
    }
  };

  const confirmarDesbloqueio = async () => {
    if (!modalDesbloqueio || !dataDesbloqueio) return;
    setDesbloqueando(true);
    try {
      const expira = new Date(`${dataDesbloqueio}T23:59:59`).toISOString();
      const { error } = await supabaseClient
        .from('gbp_empresas')
        .update({ status: 'active', ativa: true, data_expiracao: expira })
        .eq('uid', modalDesbloqueio.uid);
      if (error) throw error;
      toast({
        title: 'Prazo prorrogado',
        description: `${modalDesbloqueio.nome} liberado até ${fmtData(expira)}.`,
      });
      setModalDesbloqueio(null);
      await carregar();
    } catch (e: any) {
      toast({
        title: 'Erro ao prorrogar',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setDesbloqueando(false);
    }
  };

  const statusEmpresa = (emp: Empresa) => {
    if (emp.ativa === false)
      return { label: 'Inativa', cls: 'bg-gray-200 text-gray-600' };
    if (!empresaBloqueada(emp))
      return { label: 'Ativa', cls: 'bg-green-100 text-green-800' };
    return { label: 'Bloqueada', cls: 'bg-red-100 text-red-800' };
  };

  // Campos do formulário de empresa — usados no painel inline (criar) e no dialog (editar)
  const camposEmpresa = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <label className={labelCls}>Nome *</label>
        <input
          className={inputCls}
          value={form.nome}
          onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
        />
      </div>
      <div>
        <label className={labelCls}>CPF/CNPJ (para cobrança)</label>
        <input
          className={inputCls}
          value={form.cpf_cnpj}
          onChange={(e) =>
            setForm((f) => ({ ...f, cpf_cnpj: e.target.value }))
          }
          placeholder="Somente números"
        />
      </div>
      <div>
        <label className={labelCls}>Telefone</label>
        <input
          className={inputCls}
          value={form.contato}
          onChange={(e) => setForm((f) => ({ ...f, contato: e.target.value }))}
        />
      </div>
      <div>
        <label className={labelCls}>Cidade</label>
        <input
          className={inputCls}
          value={form.cidade}
          onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
        />
      </div>
      <div>
        <label className={labelCls}>Estado (UF)</label>
        <input
          className={inputCls}
          value={form.estado}
          onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
          maxLength={2}
        />
      </div>
      <div>
        <label className={labelCls}>Dia de vencimento</label>
        <select
          className={inputCls}
          value={form.dia_vencimento}
          onChange={(e) =>
            setForm((f) => ({ ...f, dia_vencimento: e.target.value }))
          }
        >
          {[5, 10, 15, 20, 25].map((d) => (
            <option key={d} value={d}>
              Dia {d}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Plano</label>
        <select
          className={inputCls}
          value={form.plano_id}
          onChange={(e) =>
            setForm((f) => ({ ...f, plano_id: e.target.value }))
          }
        >
          <option value="">Sem plano</option>
          {planos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} — {p.valor > 0 ? fmtBRL(p.valor) : 'Sob consulta'}
            </option>
          ))}
        </select>
      </div>
      {!editando && (
        <>
          <div className="sm:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Usuário administrador (criado junto com a empresa)
            </p>
          </div>
          <div>
            <label className={labelCls}>Nome do usuário</label>
            <input
              className={inputCls}
              value={form.usuario_nome}
              onChange={(e) =>
                setForm((f) => ({ ...f, usuario_nome: e.target.value }))
              }
              placeholder="Josuel Mendes"
            />
          </div>
          <div>
            <label className={labelCls}>E-mail *</label>
            <input
              className={inputCls}
              type="email"
              value={form.usuario_email}
              onChange={(e) =>
                setForm((f) => ({ ...f, usuario_email: e.target.value }))
              }
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <label className={labelCls}>Senha</label>
            <input
              className={inputCls}
              value={form.usuario_senha}
              onChange={(e) =>
                setForm((f) => ({ ...f, usuario_senha: e.target.value }))
              }
              placeholder="8433135"
            />
          </div>
        </>
      )}
      <div className="sm:col-span-2 flex items-center gap-2 pt-1">
        <input
          id="emp-ativa"
          type="checkbox"
          checked={form.ativa}
          onChange={(e) =>
            setForm((f) => ({ ...f, ativa: e.target.checked }))
          }
          className="rounded border-gray-300"
        />
        <label
          htmlFor="emp-ativa"
          className="text-sm text-gray-700 dark:text-gray-300"
        >
          Empresa ativa (segue conosco) — desmarque se o vínculo foi encerrado
        </label>
      </div>
    </div>
  );

  const pedirConfirmacao = () => {
    if (!form.nome.trim()) {
      toast({ title: 'Informe o nome da empresa', variant: 'destructive' });
      return;
    }
    setConfirmando(true);
  };

  const acoesEmpresa = (
    <div className="flex justify-end gap-2 pt-3">
      <Button variant="outline" onClick={() => setModalEmpresa(false)}>
        Cancelar
      </Button>
      <Button
        onClick={editando ? salvarEmpresa : pedirConfirmacao}
        disabled={salvando}
      >
        {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Criar empresa'}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex-1 py-2 md:py-6 px-2 md:px-4 flex flex-col">
        <div className="flex flex-col space-y-4 flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="shrink-0 h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm md:text-lg font-bold text-gray-900 dark:text-white leading-tight whitespace-nowrap truncate">
                <span className="sm:hidden">Credenciados</span>
                <span className="hidden sm:inline">Administração de Credenciados</span>
              </h1>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap truncate">
                <span className="sm:hidden">Empresas, planos e cobranças</span>
                <span className="hidden sm:inline">Empresas, planos e cobranças da plataforma</span>
              </p>
            </div>
            <div className="flex w-full sm:w-auto items-center gap-2">
              <div className="flex flex-1 sm:flex-none rounded-lg bg-gray-100 dark:bg-gray-700 p-0.5">
                {(
                  [
                    ['empresas', 'Empresas'],
                    ['pagamentos', 'Pagamentos'],
                    ['relatorio', 'Relatório'],
                  ] as const
                ).map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setVisao(k)}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      visao === k
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-300'
                    }`}
                  >
                    <span
                      className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${
                        visao === k
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-300 dark:border-gray-500 text-transparent'
                      }`}
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    {l}
                  </button>
                ))}
              </div>
              {visao === 'empresas' && (
                <>
                  <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                    {empresasFiltradas.length} empresa(s)
                  </span>
                  <Button
                    onClick={abrirNova}
                    size="sm"
                    className="gap-1.5 shrink-0 whitespace-nowrap hidden sm:inline-flex"
                  >
                    <Plus className="h-4 w-4" /> Nova empresa
                  </Button>
                </>
              )}
            </div>
          </div>

          {visao === 'empresas' && (
            <button
              onClick={abrirNova}
              aria-label="Nova empresa"
              className="fixed bottom-5 right-5 z-40 w-11 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors sm:hidden"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}

          {visao === 'empresas' && (
            <>
          {/* KPIs da carteira: clientes + receita mensal dos planos */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 flex items-center gap-2.5">
              <span className="shrink-0 h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </span>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {resumoClientes.ativos}
                </p>
                <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  Clientes
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 flex items-center gap-2.5">
              <span className="shrink-0 h-8 w-8 rounded-full bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
                <Receipt className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              </span>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {resumoClientes.comPlano}
                </p>
                <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  Com plano
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 flex items-center gap-2.5">
              <span className="shrink-0 h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </span>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight truncate">
                  {fmtBRL(resumoClientes.receitaMensal)}
                </p>
                <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  Receita mensal
                </p>
              </div>
            </div>
          </div>

          {/* Criação de empresa — painel inline na página */}
          {modalEmpresa && !editando && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-indigo-100 dark:border-indigo-900">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                Nova empresa
              </h3>
              {camposEmpresa}
              {acoesEmpresa}
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, cidade, CPF/CNPJ..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <select
                value={filtroStatus}
                onChange={(e) =>
                  setFiltroStatus(
                    e.target.value as 'todas' | 'ativas' | 'bloqueadas'
                  )
                }
                className="flex-1 sm:flex-none min-w-0 px-2.5 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                <option value="todas">Todas</option>
                <option value="ativas">Ativas</option>
                <option value="bloqueadas">Bloqueadas</option>
              </select>
              <select
                value={String(filtroDia)}
                onChange={(e) =>
                  setFiltroDia(
                    e.target.value === 'todos' ? 'todos' : Number(e.target.value)
                  )
                }
                className="flex-1 sm:flex-none min-w-0 px-2.5 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                <option value="todos">Vencimento</option>
                {diasVencimento.map((d) => (
                  <option key={d} value={d}>
                    Dia {d}
                  </option>
                ))}
              </select>
              <label className="shrink-0 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={mostrarInativas}
                  onChange={(e) => setMostrarInativas(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Encerradas
              </label>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex-1 flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : empresasFiltradas.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-gray-400">
                <Users className="h-10 w-10 mb-2" />
                <p className="text-sm">Nenhuma empresa encontrada.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {empresasFiltradas.slice(0, visiveis).map((emp) => {
                  const ass = assinaturaByEmpresa[emp.uid];
                  const plano = ass?.plano_id ? planoById[ass.plano_id] : null;
                  const st = statusEmpresa(emp);
                  const pend = pendentesPorEmpresa[emp.uid] || 0;
                  return (
                    <div
                      key={emp.uid}
                      onClick={() => navigate(`/app/admin/credenciados/${emp.uid}`)}
                      className={`py-3 flex items-start md:items-center gap-2 cursor-pointer rounded-lg px-2 -mx-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                        emp.ativa === false ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {emp.nome || emp.apelido || 'Sem nome'}
                          </p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}
                          >
                            {st.label}
                          </span>
                          {pend > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800">
                              {pend} pendência{pend > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap gap-x-3">
                          {emp.cidade && (
                            <span>
                              {emp.cidade}
                              {emp.estado ? `/${emp.estado}` : ''}
                            </span>
                          )}
                          <span>
                            Plano:{' '}
                            {plano
                              ? `${plano.nome} (${fmtBRL(plano.valor)})`
                              : '—'}
                          </span>
                          <span>Venc. dia {emp.dia_vencimento || 20}</span>
                          {emp.data_expiracao && (
                            <span>Expira: {fmtData(emp.data_expiracao)}</span>
                          )}
                        </p>
                      </div>
                      <div
                        className="flex items-center shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() =>
                                navigate(`/app/admin/credenciados/${emp.uid}`)
                              }
                            >
                              <Building2 className="h-4 w-4" /> Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => abrirPagamentos(emp)}
                            >
                              <DollarSign className="h-4 w-4" /> Pagamentos
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => abrirEdicao(emp)}
                            >
                              <Pencil className="h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => abrirDesbloqueio(emp)}
                            >
                              <CalendarClock className="h-4 w-4" /> Prorrogar acesso
                            </DropdownMenuItem>
                            {st.label === 'Bloqueada' || st.label === 'Inativa' ? (
                              <DropdownMenuItem
                                className="gap-2 text-green-600 focus:text-green-600"
                                onClick={() => ativarEmpresa(emp)}
                              >
                                <CheckCircle2 className="h-4 w-4" /> Ativar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="gap-2 text-red-600 focus:text-red-600"
                                onClick={() => abrirBloqueio(emp)}
                              >
                                <Ban className="h-4 w-4" /> Bloquear
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
                {visiveis < empresasFiltradas.length ? (
                  <div ref={sentinelRef} className="py-4">
                    <button
                      type="button"
                      onClick={() => setVisiveis((v) => v + PAGE_SIZE)}
                      className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Carregando mais empresas...
                    </button>
                  </div>
                ) : (
                  empresasFiltradas.length > PAGE_SIZE && (
                    <p className="py-3 text-center text-xs text-gray-400">
                      Todas as {empresasFiltradas.length} empresas exibidas
                    </p>
                  )
                )}
              </div>
            )}
          </div>
            </>
          )}

          {/* Pagamentos do mês */}
          {visao === 'pagamentos' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="shrink-0 h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Receipt className="h-4 w-4 text-emerald-600" />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                  Pagamentos do mês
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="sm:hidden">
                    {resumoPag.pago} pago · {resumoPag.pendente} pend. · {resumoPag.sem} s/ cobrança · {fmtBRL(resumoPag.recebido)}
                  </span>
                  <span className="hidden sm:inline">
                    {resumoPag.pago} paga(s) · {resumoPag.pendente} pendente(s) · {resumoPag.sem} sem cobrança · Recebido {fmtBRL(resumoPag.recebido)}
                  </span>
                </p>
              </div>
              <input
                type="month"
                value={mesRef}
                onChange={(e) => e.target.value && setMesRef(e.target.value)}
                className="w-full sm:w-auto px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              {(
                [
                  ['todos', 'Todos'],
                  ['pendente', 'Pendente'],
                  ['pago', 'Pago'],
                  ['sem', 'Sem cobrança'],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFiltroPag(k)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                    filtroPag === k
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {linhasPag.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Nenhuma empresa neste filtro.
              </p>
            ) : (
              <div className="max-h-[28rem] overflow-y-auto">
                {gruposPag.map((grupo) => (
                  <div key={grupo.dia}>
                    <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700/50 px-2 py-1.5 flex items-center justify-between rounded">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                        Vencimento dia {grupo.dia}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {grupo.pagos} pago(s) · {grupo.pendentes} pendente(s)
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {grupo.linhas.map(({ emp, pag, plano }) => {
                        const st = pag
                          ? statusPagamento[pag.status] || statusPagamento.pending
                          : null;
                        const stEmp = statusEmpresa(emp);
                        const emAberto =
                          pag &&
                          (pag.status === 'pending' || pag.status === 'overdue');
                        return (
                          <div
                            key={emp.uid}
                            className="py-2.5 px-1 flex items-center gap-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                          >
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() =>
                                navigate(`/app/admin/credenciados/${emp.uid}`)
                              }
                            >
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {emp.nome || emp.apelido || 'Sem nome'}
                                </p>
                                {stEmp.label === 'Bloqueada' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                                    Bloqueada
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {fmtBRL(pag ? Number(pag.valor) : plano?.valor ?? 0)}
                                {pag?.data_vencimento && ` · venc. ${fmtData(pag.data_vencimento)}`}
                                {pag?.status === 'paid' &&
                                  pag.data_pagamento &&
                                  ` · pago em ${fmtData(pag.data_pagamento)}`}
                              </p>
                            </div>
                            {st ? (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}
                              >
                                {st.label}
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                Sem cobrança
                              </span>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 shrink-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() =>
                                    navigate(
                                      `/app/admin/credenciados/${emp.uid}`
                                    )
                                  }
                                >
                                  <Eye className="h-4 w-4" /> Detalhes
                                </DropdownMenuItem>
                                {(!pag || emAberto) && (
                                  <DropdownMenuItem
                                    className="gap-2 text-emerald-700 focus:text-emerald-700"
                                    onClick={() => abrirBaixa(emp, pag ?? null)}
                                  >
                                    <Banknote className="h-4 w-4" />
                                    Dar baixa (recebeu por outro meio)
                                  </DropdownMenuItem>
                                )}
                                {emAberto && (
                                  <DropdownMenuItem
                                    className="gap-2"
                                    disabled={verificandoId === pag!.id}
                                    onClick={() => verificarPagamento(pag!.id)}
                                  >
                                    <RefreshCw
                                      className={`h-4 w-4 ${
                                        verificandoId === pag!.id
                                          ? 'animate-spin'
                                          : ''
                                      }`}
                                    />
                                    Verificar status
                                  </DropdownMenuItem>
                                )}
                                {!pag && (
                                  <DropdownMenuItem
                                    className="gap-2"
                                    disabled={gerandoEmpresa === emp.uid}
                                    onClick={() => gerarCobrancaPix(emp)}
                                  >
                                    <QrCode
                                      className={`h-4 w-4 ${
                                        gerandoEmpresa === emp.uid
                                          ? 'animate-pulse'
                                          : ''
                                      }`}
                                    />
                                    Gerar cobrança PIX
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => abrirDesbloqueio(emp)}
                                >
                                  <CalendarClock className="h-4 w-4" />
                                  Prorrogar acesso
                                </DropdownMenuItem>
                                {stEmp.label === 'Bloqueada' ||
                                stEmp.label === 'Inativa' ? (
                                  <DropdownMenuItem
                                    className="gap-2 text-green-600 focus:text-green-600"
                                    onClick={() => ativarEmpresa(emp)}
                                  >
                                    <CheckCircle2 className="h-4 w-4" /> Ativar
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    className="gap-2 text-red-600 focus:text-red-600"
                                    onClick={() => abrirBloqueio(emp)}
                                  >
                                    <Ban className="h-4 w-4" /> Bloquear
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Relatório: faturamento mês a mês */}
          {visao === 'relatorio' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="shrink-0 h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                    Faturamento mês a mês
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Cobranças por mês de vencimento
                  </p>
                </div>
                <select
                  value={mesesHist}
                  onChange={(e) => setMesesHist(Number(e.target.value))}
                  className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  <option value={1}>Mês atual</option>
                  <option value={3}>3 meses</option>
                  <option value={6}>6 meses</option>
                  <option value={12}>12 meses</option>
                </select>
              </div>

              {/* Cards resumo do período */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Faturado</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {fmtBRL(totaisGrafico.faturado)}
                  </p>
                </div>
                <button
                  onClick={() =>
                    navigate(
                      `/app/admin/credenciados/relatorio/pagamentos?status=paid&meses=${mesesHist}`
                    )
                  }
                  className="text-left rounded-lg border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 hover:ring-2 hover:ring-emerald-300 transition"
                >
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Recebido</p>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {fmtBRL(totaisGrafico.recebido)}
                  </p>
                </button>
                <button
                  onClick={() =>
                    navigate(
                      `/app/admin/credenciados/relatorio/pagamentos?status=aberto&meses=${mesesHist}`
                    )
                  }
                  className="text-left rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-3 hover:ring-2 hover:ring-amber-300 transition"
                >
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">Em aberto</p>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    {fmtBRL(totaisGrafico.aberto)}
                  </p>
                </button>
                <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">% recebido</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {totaisGrafico.faturado > 0
                      ? `${Math.round((totaisGrafico.recebido / totaisGrafico.faturado) * 100)}%`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Gráfico */}
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGrafico} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`
                      }
                      width={52}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => [fmtBRL(Number(value)), name]}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="faturado" name="Faturado" fill="#818cf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="recebido" name="Recebido" fill="#34d399" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="aberto" name="Em aberto" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detalhamento por mês */}
              <div className="divide-y divide-gray-100 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-700">
                {[...dadosGrafico].reverse().map((m) => (
                  <div
                    key={m.key}
                    onClick={() => setMesRel(m.key)}
                    className="py-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs cursor-pointer rounded px-1 -mx-1 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <span className="font-semibold text-gray-800 dark:text-gray-200 w-14">
                      {m.label}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      Fat. {fmtBRL(m.faturado)}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Rec. {fmtBRL(m.recebido)}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400">
                      Falta {fmtBRL(m.aberto)}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 ml-auto">
                      {m.qtdPago} pago · {m.qtdAberto} aberto · {m.semCobranca} s/ cobrança
                    </span>
                  </div>
                ))}
              </div>

              {/* Relatório do mês selecionado */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Relatório do mês
                  </h3>
                  <input
                    type="month"
                    value={mesRel}
                    onChange={(e) => e.target.value && setMesRel(e.target.value)}
                    className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                  />
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                    Faturado{' '}
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{fmtBRL(relMes.totPago + relMes.totAberto)}</span>{' '}
                    · Recebido{' '}
                    <span className="text-emerald-600 font-medium">{fmtBRL(relMes.totPago)}</span> ·
                    Falta <span className="text-amber-600 font-medium">{fmtBRL(relMes.totAberto)}</span> ·
                    Previsto {fmtBRL(relMes.totPrevisto)}
                  </span>
                </div>

                {(
                  [
                    ['pago', `Pagaram (${relMes.pago.length} · ${fmtBRL(relMes.totPago)})`, 'emerald', relMes.pago],
                    ['aberto', `Em aberto (${relMes.aberto.length} · ${fmtBRL(relMes.totAberto)})`, 'amber', relMes.aberto],
                    ['sem', `Sem cobrança (${relMes.sem.length})`, 'gray', relMes.sem],
                  ] as const
                ).map(([k, titulo, cor, linhas]) => (
                  <div key={k} className="mb-3">
                    <p
                      className={`text-xs font-bold uppercase tracking-wide mb-1 ${
                        cor === 'emerald'
                          ? 'text-emerald-600'
                          : cor === 'amber'
                          ? 'text-amber-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {titulo}
                    </p>
                    {linhas.length === 0 ? (
                      <p className="text-xs text-gray-400 pl-1">—</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                        {linhas.map((l) => (
                          <div
                            key={l.emp.uid}
                            onClick={() =>
                              navigate(`/app/admin/credenciados/${l.emp.uid}`)
                            }
                            className="py-1 flex items-baseline gap-2 text-xs cursor-pointer rounded px-1 -mx-1 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                          >
                            <span className="text-gray-800 dark:text-gray-200 truncate">
                              {l.emp.nome || l.emp.apelido || 'Sem nome'}
                            </span>
                            <span className="text-gray-400 whitespace-nowrap ml-auto">
                              {fmtBRL(l.valor)}
                              {l.key === 'pago' && l.pag?.data_pagamento
                                ? ` · ${fmtData(l.pag.data_pagamento)}`
                                : ''}
                              {l.key === 'aberto' && l.pag?.data_vencimento
                                ? ` · venc. ${fmtData(l.pag.data_vencimento)}`
                                : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: edição de empresa (criação é inline na página) */}
      <Dialog
        open={modalEmpresa && !!editando}
        onOpenChange={setModalEmpresa}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar empresa</DialogTitle>
          </DialogHeader>
          {camposEmpresa}
          {acoesEmpresa}
        </DialogContent>
      </Dialog>

      {/* Modal: confirmação antes de criar a empresa */}
      <Dialog open={confirmando} onOpenChange={setConfirmando}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar criação</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
            <p>
              Criar a empresa <b>{form.nome.trim()}</b>
              {form.cpf_cnpj.trim() ? ` (CPF/CNPJ ${form.cpf_cnpj.trim()})` : ''}?
            </p>
            {form.usuario_email.trim() ? (
              <p>
                Será criado o usuário admin <b>{form.usuario_email.trim()}</b>
                {form.usuario_nome.trim() ? ` (${form.usuario_nome.trim()})` : ''}
                .
              </p>
            ) : (
              <p className="text-amber-600">
                Sem e-mail informado — a empresa será criada sem usuário de
                acesso.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setConfirmando(false)}>
              Voltar
            </Button>
            <Button
              disabled={salvando}
              onClick={() => {
                setConfirmando(false);
                salvarEmpresa();
              }}
            >
              {salvando ? 'Criando...' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: pagamentos da empresa */}
      <Dialog
        open={!!modalPagamentos}
        onOpenChange={() => setModalPagamentos(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pagamentos — {modalPagamentos?.nome}</DialogTitle>
          </DialogHeader>
          {loadingPagamentos ? (
            <div className="py-10 flex justify-center">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : pagamentos.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Nenhuma cobrança registrada para esta empresa.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {pagamentos.map((p) => {
                const st = statusPagamento[p.status] || statusPagamento.pending;
                return (
                  <div key={p.id} className="py-3 flex items-center gap-3">
                    <span className="shrink-0">
                      {p.tipo_pagamento === 'pix' ? (
                        <QrCode className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Barcode className="h-4 w-4 text-emerald-600" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {fmtBRL(p.valor)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}
                        >
                          {st.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {p.tipo_pagamento === 'pix' ? 'PIX' : 'Boleto'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Vencimento: {fmtData(p.data_vencimento)}
                        {p.data_pagamento &&
                          ` • Pago em ${fmtData(p.data_pagamento)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(p.status === 'pending' || p.status === 'overdue') &&
                        p.gateway_url && (
                          <a
                            href={p.gateway_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm" className="gap-1">
                              <ExternalLink className="h-3.5 w-3.5" /> Abrir
                            </Button>
                          </a>
                        )}
                      {(p.status === 'pending' || p.status === 'overdue') && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={verificandoId === p.id}
                          onClick={() => verificarPagamento(p.id)}
                        >
                          {verificandoId === p.id ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            'Verificar'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: baixa manual (recebido por outro meio) */}
      <Dialog open={!!baixaAlvo} onOpenChange={() => setBaixaAlvo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-600" />
              Dar baixa — {baixaAlvo?.emp.nome || baixaAlvo?.emp.apelido}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Use quando o valor <strong>já foi recebido por outro meio</strong>{' '}
            (dinheiro, transferência, PIX direto...). Será registrado um
            pagamento de <strong>{fmtBRL(valorBaixaAlvo())}</strong> como pago
            {baixaAlvo?.pag ? ' e o Asaas será informado.' : '.'}
          </p>
          <div>
            <label className={labelCls}>Data do recebimento</label>
            <input
              type="date"
              className={inputCls}
              value={dataBaixa}
              onChange={(e) => setDataBaixa(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setBaixaAlvo(null)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarBaixa}
              disabled={baixando || !dataBaixa}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <Banknote className="h-3.5 w-3.5" />
              {baixando ? 'Baixando...' : 'Confirmar baixa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: desbloqueio temporário */}
      <Dialog
        open={!!modalDesbloqueio}
        onOpenChange={() => setModalDesbloqueio(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Prorrogar acesso — {modalDesbloqueio?.nome}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            A empresa ficará com acesso <strong>ativo até a data escolhida</strong>.
            Após esse prazo, se houver pendências, ela volta a ser bloqueada
            automaticamente.
          </p>
          <div>
            <label className={labelCls}>Prorrogar até</label>
            <input
              type="date"
              className={inputCls}
              value={dataDesbloqueio}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDataDesbloqueio(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => setModalDesbloqueio(null)}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarDesbloqueio}
              disabled={desbloqueando || !dataDesbloqueio}
              className="gap-1.5"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {desbloqueando ? 'Prorrogando...' : 'Prorrogar acesso'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: bloquear empresa */}
      <Dialog
        open={!!modalBloqueio}
        onOpenChange={() => setModalBloqueio(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-600" />
              Bloquear empresa — {modalBloqueio?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(
              [
                {
                  key: 'pagamento' as const,
                  titulo: 'Falta de pagamento',
                  desc: 'Usuários serão direcionados à página de regularização para pagar e liberar o acesso.',
                },
                {
                  key: 'inativo' as const,
                  titulo: 'Empresa não é mais cliente',
                  desc: 'Encerra o vínculo (empresa inativa). Usuários são direcionados à página de vínculo encerrado, sem opção de pagamento.',
                },
              ]
            ).map((op) => {
              const sel = motivoBloqueio === op.key;
              return (
                <button
                  key={op.key}
                  type="button"
                  onClick={() => setMotivoBloqueio(op.key)}
                  className={`w-full text-left border rounded-xl p-3 flex items-start gap-3 transition-colors ${
                    sel
                      ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                  }`}
                >
                  <span
                    className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      sel
                        ? 'bg-red-600 border-red-600'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'
                    }`}
                  >
                    {sel && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {op.titulo}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {op.desc}
                    </p>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setModalBloqueio(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarBloqueio}
              disabled={bloqueando}
              className="gap-1.5"
            >
              <Ban className="h-3.5 w-3.5" />
              {bloqueando ? 'Bloqueando...' : 'Confirmar bloqueio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
