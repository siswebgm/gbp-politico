import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CalendarDays, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, RefreshCw } from 'lucide-react';
import InputMask from 'react-input-mask';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { supabaseClient } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { generateReport } from '../../utils/reportGenerator';

type Company = {
  uid: string;
  nome: string | null;
  apelido?: string | null;
  cidade?: string | null;
  estado?: string | null;
  logo?: string | null;
};

type PeriodPreset = 'today' | '7d' | '30d' | 'custom';

type RecentKind = 'cadastro' | 'atendimento' | 'demanda';

type RecentItem = {
  kind: RecentKind;
  empresa_uid: string;
  empresa_label: string;
  created_at: string;
  title: string;
  subtitle?: string;
};

type RecentExportRow = {
  ambiente: string;
  registro: string;
  detalhe: string;
  data: string;
};

type AmbienteProducao = {
  uid: string;
  label: string;
  total: number;
};

type ComparacaoLinhaPoint = {
  date: string;
  iso: string;
  [empresa_uid: string]: any;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatShortLabel(input: string, max = 16) {
  const s = String(input || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function formatDateInput(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

function parseDateInput(v: string) {
  const [d, m, y] = v.split('/').map((x) => Number(x));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function toTitleCase(input: string) {
  const s = String(input || '').trim();
  if (!s) return '';
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

export function GerenciamentoAmbientes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const recentScrollRef = useRef<HTMLDivElement | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preset, setPreset] = useState<PeriodPreset>('today');
  const [customStart, setCustomStart] = useState(() => formatDateInput(startOfDay(new Date())));
  const [customEnd, setCustomEnd] = useState(() => formatDateInput(startOfDay(new Date())));

  const [recentKind, setRecentKind] = useState<RecentKind>('cadastro');
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  const [loadingComparacao, setLoadingComparacao] = useState(false);
  const [comparacaoAmbientes, setComparacaoAmbientes] = useState<AmbienteProducao[]>([]);

  const [loadingComparacaoLinha, setLoadingComparacaoLinha] = useState(false);
  const [comparacaoLinha, setComparacaoLinha] = useState<ComparacaoLinhaPoint[]>([]);

  const [ambienteFilterUid, setAmbienteFilterUid] = useState<string>('all');

  const [recentPage, setRecentPage] = useState(1);
  const recentItemsPerPage = 10;

  const period = useMemo(() => {
    const today = startOfDay(new Date());

    if (preset === 'today') {
      const start = today;
      const end = addDays(today, 1);
      return { start, end };
    }

    if (preset === '7d') {
      const start = addDays(today, -6);
      const end = addDays(today, 1);
      return { start, end };
    }

    if (preset === '30d') {
      const start = addDays(today, -29);
      const end = addDays(today, 1);
      return { start, end };
    }

    const parsedStart = parseDateInput(customStart);
    const parsedEnd = parseDateInput(customEnd);
    const start = startOfDay(parsedStart || today);
    const end = addDays(startOfDay(parsedEnd || today), 1);
    return { start, end };
  }, [preset, customStart, customEnd]);

  useEffect(() => {
    let isMounted = true;

    async function loadCompanies() {
      if (!user?.uid) {
        if (isMounted) {
          setCompanies([]);
          setLoadingCompanies(false);
        }
        return;
      }

      setLoadingCompanies(true);
      setError(null);

      try {
        const empresaUids = new Set<string>();
        if (user.empresa_uid) empresaUids.add(user.empresa_uid);

        const { data: extraLinks, error: extraError } = await supabaseClient
          .from('gbp_usuario_empresas')
          .select('empresa_uid')
          .eq('user_uid', user.uid)
          .eq('ativo', true);

        if (extraError) throw extraError;

        (extraLinks || []).forEach((l: any) => {
          if (l?.empresa_uid) empresaUids.add(l.empresa_uid);
        });

        const empresaUidList = Array.from(empresaUids);
        if (empresaUidList.length === 0) {
          if (isMounted) setCompanies([]);
          return;
        }

        const { data: companiesData, error: companiesError } = await supabaseClient
          .from('gbp_empresas')
          .select('uid,nome,apelido,cidade,estado,logo')
          .in('uid', empresaUidList);

        if (companiesError) throw companiesError;
        if (!isMounted) return;

        setCompanies((companiesData || []) as Company[]);
      } catch (e: any) {
        console.error('[GerenciamentoAmbientes] Erro ao carregar empresas:', e);
        if (isMounted) setError(e?.message || 'Erro ao carregar empresas');
      } finally {
        if (isMounted) setLoadingCompanies(false);
      }
    }

    loadCompanies();
    return () => {
      isMounted = false;
    };
  }, [user?.uid, user?.empresa_uid]);

  const loadRecent = useCallback(async () => {
    if (!companies.length) {
      setRecentItems([]);
      return;
    }

    const companiesToLoad = ambienteFilterUid === 'all' ? companies : companies.filter((c) => c.uid === ambienteFilterUid);

    setLoadingRecent(true);
    const startIso = period.start.toISOString();
    const endIso = period.end.toISOString();

    try {
      const next: RecentItem[] = [];

      await Promise.all(
        companiesToLoad.map(async (c) => {
          const empresa_uid = c.uid;
          const empresa_label = c.apelido || c.nome || 'Empresa';

          if (recentKind === 'cadastro') {
            const { data } = await supabaseClient
              .from('gbp_eleitores')
              .select('uid,nome,created_at')
              .eq('empresa_uid', empresa_uid)
              .gte('created_at', startIso)
              .lt('created_at', endIso)
              .order('created_at', { ascending: false })
              .limit(5);

            (data || []).forEach((row: any) => {
              next.push({
                kind: 'cadastro',
                empresa_uid,
                empresa_label,
                created_at: String(row?.created_at || ''),
                title: String(row?.nome || 'Cadastro'),
              });
            });
          }

          if (recentKind === 'atendimento') {
            const { data } = await supabaseClient
              .from('gbp_atendimentos')
              .select('uid,created_at,status')
              .eq('empresa_uid', empresa_uid)
              .gte('created_at', startIso)
              .lt('created_at', endIso)
              .order('created_at', { ascending: false })
              .limit(5);

            (data || []).forEach((row: any) => {
              next.push({
                kind: 'atendimento',
                empresa_uid,
                empresa_label,
                created_at: String(row?.created_at || ''),
                title: `Atendimento ${String(row?.uid || '').slice(0, 8)}`,
                subtitle: row?.status ? `Status: ${row.status}` : undefined,
              });
            });
          }

          if (recentKind === 'demanda') {
            const { data, error } = await supabaseClient
              .from('gbp_demandas_ruas')
              .select('uid,tipo_de_demanda,status,criado_em')
              .eq('empresa_uid', empresa_uid)
              .eq('excluido', false)
              .gte('criado_em', startIso)
              .lt('criado_em', endIso)
              .order('criado_em', { ascending: false })
              .limit(5);

            if (error) return;

            (data || []).forEach((row: any) => {
              next.push({
                kind: 'demanda',
                empresa_uid,
                empresa_label,
                created_at: String(row?.criado_em || ''),
                title: String(row?.tipo_de_demanda || 'Demanda'),
                subtitle: row?.status ? `Status: ${row.status}` : undefined,
              });
            });
          }
        })
      );

      next.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setRecentItems(next);
    } catch (e) {
      console.error('[GerenciamentoAmbientes] Erro ao carregar conteúdo recente:', e);
      setRecentItems([]);
    } finally {
      setLoadingRecent(false);
    }
  }, [ambienteFilterUid, companies, period.end, period.start, recentKind]);

  const loadComparacao = useCallback(async () => {
    if (!companies.length) {
      setComparacaoAmbientes([]);
      return;
    }

    setLoadingComparacao(true);
    const startIso = period.start.toISOString();
    const endIso = period.end.toISOString();

    try {
      const next: AmbienteProducao[] = [];

      await Promise.all(
        companies.map(async (c) => {
          const empresa_uid = c.uid;
          const empresa_label = toTitleCase(c.apelido || c.nome || 'Ambiente');

          if (recentKind === 'cadastro') {
            const { count } = await supabaseClient
              .from('gbp_eleitores')
              .select('*', { count: 'exact', head: true })
              .eq('empresa_uid', empresa_uid)
              .gte('created_at', startIso)
              .lt('created_at', endIso);

            next.push({ uid: empresa_uid, label: empresa_label, total: count || 0 });
          }

          if (recentKind === 'atendimento') {
            const { count } = await supabaseClient
              .from('gbp_atendimentos')
              .select('*', { count: 'exact', head: true })
              .eq('empresa_uid', empresa_uid)
              .gte('created_at', startIso)
              .lt('created_at', endIso);

            next.push({ uid: empresa_uid, label: empresa_label, total: count || 0 });
          }

          if (recentKind === 'demanda') {
            const { count } = await supabaseClient
              .from('gbp_demandas_ruas')
              .select('*', { count: 'exact', head: true })
              .eq('empresa_uid', empresa_uid)
              .eq('excluido', false)
              .gte('criado_em', startIso)
              .lt('criado_em', endIso);

            next.push({ uid: empresa_uid, label: empresa_label, total: count || 0 });
          }
        })
      );

      next.sort((a, b) => b.total - a.total);
      setComparacaoAmbientes(next);
    } catch (e) {
      console.error('[GerenciamentoAmbientes] Erro ao carregar comparação:', e);
      setComparacaoAmbientes([]);
    } finally {
      setLoadingComparacao(false);
    }
  }, [companies, period.end, period.start, recentKind]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    void loadComparacao();
  }, [loadComparacao]);

  useEffect(() => {
    setRecentPage(1);
  }, [recentKind, preset, customStart, customEnd, ambienteFilterUid]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(recentItems.length / recentItemsPerPage));
    if (recentPage > totalPages) setRecentPage(totalPages);
  }, [recentItems.length, recentItemsPerPage, recentPage]);

  const comparacaoTotal = useMemo(() => {
    return comparacaoAmbientes.reduce((acc, cur) => acc + (cur.total || 0), 0);
  }, [comparacaoAmbientes]);

  const comparacaoPieData = useMemo(() => {
    const top = comparacaoAmbientes.slice(0, 6);
    const rest = comparacaoAmbientes.slice(6);
    const outrosTotal = rest.reduce((acc, cur) => acc + (cur.total || 0), 0);
    return outrosTotal > 0 ? [...top, { uid: 'outros', label: 'Outros', total: outrosTotal }] : top;
  }, [comparacaoAmbientes]);

  const comparacaoColors = useMemo(() => {
    return ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'];
  }, []);

  const topComparacaoAmbientes = useMemo(() => {
    return comparacaoAmbientes.filter((x) => (x.total || 0) > 0).slice(0, 5);
  }, [comparacaoAmbientes]);

  const comparacaoLinhaHasData = useMemo(() => {
    if (comparacaoLinha.length === 0 || topComparacaoAmbientes.length === 0) return false;
    return comparacaoLinha.some((p) => topComparacaoAmbientes.some((env) => Number(p?.[env.uid] || 0) > 0));
  }, [comparacaoLinha, topComparacaoAmbientes]);

  const loadComparacaoLinha = useCallback(() => {
    let cancelled = false;

    if (!companies.length || topComparacaoAmbientes.length === 0) {
      setComparacaoLinha([]);
      setLoadingComparacaoLinha(false);
      return () => {
        cancelled = true;
      };
    }

    setLoadingComparacaoLinha(true);

    (async () => {
      try {
        const start = startOfDay(period.start);
        const end = startOfDay(period.end);

        const days: Date[] = [];
        for (let d = new Date(start); d < end; d = addDays(d, 1)) {
          days.push(new Date(d));
        }

        const points: ComparacaoLinhaPoint[] = days.map((d) => {
          const iso = startOfDay(d).toISOString().slice(0, 10);
          return {
            date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            iso,
          };
        });

        const idxByIso = new Map(points.map((p, i) => [p.iso, i] as const));

        const PAGE_SIZE = 1000;

        async function fetchAllTimestamps(empresaUid: string): Promise<string[]> {
          const timestamps: string[] = [];
          let from = 0;

          while (true) {
            if (cancelled) return timestamps;

            if (recentKind === 'cadastro') {
              const res = await supabaseClient
                .from('gbp_eleitores')
                .select('created_at')
                .eq('empresa_uid', empresaUid)
                .gte('created_at', start.toISOString())
                .lt('created_at', end.toISOString())
                .order('created_at', { ascending: true })
                .range(from, from + PAGE_SIZE - 1);

              (res.data || []).forEach((r: any) => {
                if (r?.created_at) timestamps.push(String(r.created_at));
              });

              if (!res.data || res.data.length < PAGE_SIZE) break;
            }

            if (recentKind === 'atendimento') {
              const res = await supabaseClient
                .from('gbp_atendimentos')
                .select('created_at')
                .eq('empresa_uid', empresaUid)
                .gte('created_at', start.toISOString())
                .lt('created_at', end.toISOString())
                .order('created_at', { ascending: true })
                .range(from, from + PAGE_SIZE - 1);

              (res.data || []).forEach((r: any) => {
                if (r?.created_at) timestamps.push(String(r.created_at));
              });

              if (!res.data || res.data.length < PAGE_SIZE) break;
            }

            if (recentKind === 'demanda') {
              const res = await supabaseClient
                .from('gbp_demandas_ruas')
                .select('criado_em')
                .eq('empresa_uid', empresaUid)
                .eq('excluido', false)
                .gte('criado_em', start.toISOString())
                .lt('criado_em', end.toISOString())
                .order('criado_em', { ascending: true })
                .range(from, from + PAGE_SIZE - 1);

              (res.data || []).forEach((r: any) => {
                if (r?.criado_em) timestamps.push(String(r.criado_em));
              });

              if (!res.data || res.data.length < PAGE_SIZE) break;
            }

            from += PAGE_SIZE;
          }

          return timestamps;
        }

        for (const env of topComparacaoAmbientes) {
          if (cancelled) break;

          const timestamps = await fetchAllTimestamps(env.uid);
          if (cancelled) break;

          for (const ts of timestamps) {
            const iso = startOfDay(new Date(ts)).toISOString().slice(0, 10);
            const rowIdx = idxByIso.get(iso);
            if (rowIdx === undefined) continue;
            points[rowIdx][env.uid] = Number(points[rowIdx][env.uid] || 0) + 1;
          }
        }

        if (!cancelled) setComparacaoLinha(points);
      } catch (e) {
        console.error('[GerenciamentoAmbientes] Erro ao carregar comparação (linha):', e);
        if (!cancelled) setComparacaoLinha([]);
      } finally {
        setLoadingComparacaoLinha(false);
      }
    })();

    return () => {
      cancelled = true;
      setLoadingComparacaoLinha(false);
    };
  }, [companies.length, period.end, period.start, recentKind, topComparacaoAmbientes]);

  useEffect(() => {
    const el = recentScrollRef.current;
    if (!el) return;

    el.style.cssText =
      'overflow-x: scroll; overflow-y: visible; -webkit-overflow-scrolling: touch; width: 100%; position: relative;';

    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let isHorizontalScroll = false;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].pageX - el.offsetLeft;
      startY = e.touches[0].pageY;
      scrollLeft = el.scrollLeft;
      isHorizontalScroll = false;
    };

    const onTouchMove = (e: TouchEvent) => {
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
    };

    el.addEventListener('touchstart', onTouchStart);
    el.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove as any);
    };
  }, [recentItems.length, recentKind]);

  useEffect(() => {
    return loadComparacaoLinha();
  }, [loadComparacaoLinha]);

  const recentTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(recentItems.length / recentItemsPerPage));
  }, [recentItems.length, recentItemsPerPage]);

  const recentPagedItems = useMemo(() => {
    const start = (recentPage - 1) * recentItemsPerPage;
    return recentItems.slice(start, start + recentItemsPerPage);
  }, [recentItems, recentItemsPerPage, recentPage]);

  const recentRangeLabel = useMemo(() => {
    if (recentItems.length === 0) return '';
    const start = (recentPage - 1) * recentItemsPerPage + 1;
    const end = Math.min(recentItems.length, recentPage * recentItemsPerPage);
    return `Mostrando ${start}–${end} de ${recentItems.length}`;
  }, [recentItems.length, recentItemsPerPage, recentPage]);

  const ambienteOptions = useMemo(() => {
    return [...companies]
      .map((c) => ({
        uid: c.uid,
        label: toTitleCase(c.apelido || c.nome || 'Ambiente'),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [companies]);

  const recentExportSubtitle = useMemo(() => {
    const kindLabel =
      recentKind === 'cadastro' ? 'Cadastros' : recentKind === 'atendimento' ? 'Atendimentos' : 'Demandas';
    const ambienteLabel =
      ambienteFilterUid === 'all'
        ? 'Todos os ambientes'
        : ambienteOptions.find((o) => o.uid === ambienteFilterUid)?.label || 'Ambiente';

    const start = period.start.toLocaleDateString('pt-BR');
    const end = addDays(period.end, -1).toLocaleDateString('pt-BR');
    return `${kindLabel} • ${ambienteLabel} • ${start} a ${end}`;
  }, [ambienteFilterUid, ambienteOptions, period.end, period.start, recentKind]);

  const handleExportRecent = useCallback(
    (format: 'pdf' | 'xlsx') => {
      const data: RecentExportRow[] = recentItems.map((it) => ({
        ambiente: it.empresa_label || '-',
        registro: it.title || '-',
        detalhe: it.subtitle || '-',
        data: it.created_at ? new Date(it.created_at).toLocaleString('pt-BR') : '-',
      }));

      generateReport({
        title: 'Conteúdo recente',
        subtitle: recentExportSubtitle,
        columns: [
          { header: 'Ambiente', key: 'ambiente' },
          { header: 'Registro', key: 'registro' },
          { header: 'Detalhe', key: 'detalhe' },
          { header: 'Data', key: 'data' },
        ],
        data,
        format,
        orientation: 'landscape',
      });
    },
    [recentExportSubtitle, recentItems]
  );

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="flex-1 rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/30 p-3 md:p-4 flex flex-col gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm px-3 py-2 md:px-4 md:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-2 whitespace-nowrap">
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Voltar"
                title="Voltar"
                className="inline-flex items-center justify-center rounded-md p-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700/40 dark:hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="truncate text-2xl font-bold text-gray-900 dark:text-white">Multi-Ambientes</h2>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  void loadRecent();
                }}
                disabled={loadingCompanies || loadingRecent}
                aria-label="Atualizar"
                title="Atualizar"
                className="h-9 w-9 p-0"
              >
                <RefreshCw className={`h-4 w-4 ${loadingRecent ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-3 md:p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 sm:gap-3 sm:justify-between">
              <div className="shrink-0 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-gray-200 whitespace-nowrap">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Período</span>
              </div>

              <div className="flex-1 min-w-0 flex items-center justify-start sm:justify-end gap-2 overflow-x-auto scrollbar-hidden overscroll-x-contain [-webkit-overflow-scrolling:touch] whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setPreset('today')}
                  className={`shrink-0 inline-flex h-9 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors ${
                    preset === 'today'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('7d')}
                  className={`shrink-0 inline-flex h-9 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors ${
                    preset === '7d'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  7 dias
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('30d')}
                  className={`shrink-0 inline-flex h-9 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors ${
                    preset === '30d'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  30 dias
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('custom')}
                  aria-label="Personalizado"
                  title="Personalizado"
                  className={`shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    preset === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                </button>
              </div>

              {preset === 'custom' && (
                <div className="hidden sm:flex items-center gap-2">
                  <span className="shrink-0 text-xs font-semibold leading-none text-slate-500 dark:text-gray-400">De</span>
                  <InputMask
                    mask="99/99/9999"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    placeholder="dd/mm/aaaa"
                    inputMode="numeric"
                    aria-label="Data inicial"
                    className="h-9 w-[140px] rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                  <span className="shrink-0 text-xs font-semibold leading-none text-slate-500 dark:text-gray-400">Até</span>
                  <InputMask
                    mask="99/99/9999"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    placeholder="dd/mm/aaaa"
                    inputMode="numeric"
                    aria-label="Data final"
                    className="h-9 w-[140px] rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>
              )}
            </div>

            {preset === 'custom' && (
              <div className="grid w-full grid-cols-2 items-center gap-2 sm:hidden">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs font-semibold leading-none text-slate-500 dark:text-gray-400">De</span>
                  <InputMask
                    mask="99/99/9999"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    placeholder="dd/mm/aaaa"
                    inputMode="numeric"
                    aria-label="Data inicial"
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs font-semibold leading-none text-slate-500 dark:text-gray-400">Até</span>
                  <InputMask
                    mask="99/99/9999"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    placeholder="dd/mm/aaaa"
                    inputMode="numeric"
                    aria-label="Data final"
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-3 md:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Conteúdo recente</h3>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
              <div className="flex w-full flex-nowrap items-center gap-2 sm:w-auto">
                <div className="flex-1 min-w-0 sm:flex-none sm:w-[260px]">
                  <Select value={ambienteFilterUid} onValueChange={(v) => setAmbienteFilterUid(v)}>
                    <SelectTrigger aria-label="Filtrar ambiente" title="Filtrar ambiente" className="h-9">
                      <SelectValue placeholder="Todos os ambientes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os ambientes</SelectItem>
                      {ambienteOptions.map((c) => (
                        <SelectItem key={c.uid} value={c.uid}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportRecent('pdf')}
                    aria-label="Baixar PDF"
                    title="Baixar PDF"
                    className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 p-0 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-40 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-900/30 sm:w-auto sm:px-3"
                    disabled={loadingRecent || recentItems.length === 0}
                  >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportRecent('xlsx')}
                    aria-label="Baixar Excel"
                    title="Baixar Excel"
                    className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-0 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-900/30 sm:w-auto sm:px-3"
                    disabled={loadingRecent || recentItems.length === 0}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="hidden sm:inline">Excel</span>
                  </button>
                </div>
              </div>

              <div className="w-full mt-1.5 sm:mt-0 sm:w-[200px]">
                <Select value={recentKind} onValueChange={(v) => setRecentKind(v as any)}>
                  <SelectTrigger aria-label="Filtrar tipo" title="Filtrar tipo" className="h-9">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cadastro">Cadastros</SelectItem>
                    <SelectItem value="atendimento">Atendimentos</SelectItem>
                    <SelectItem value="demanda">Demandas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loadingRecent ? (
            <div className="mt-4 text-sm text-slate-500 dark:text-gray-400">Carregando conteúdo...</div>
          ) : recentItems.length === 0 ? null : (
            <div className="mt-4">
              <div ref={recentScrollRef} className="w-full rounded-lg border border-slate-200 dark:border-gray-700">
                <table
                  className="min-w-full w-max table-auto divide-y divide-slate-200 dark:divide-gray-700"
                  style={{ minWidth: '700px', width: '100%', borderCollapse: 'collapse', userSelect: 'none' }}
                >
                  <thead className="bg-slate-50 dark:bg-gray-800/40">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400 whitespace-nowrap">Ambiente</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400 whitespace-nowrap">Registro</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400 whitespace-nowrap">Detalhe</th>
                      <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400 whitespace-nowrap">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                    {recentPagedItems.map((it, idx) => (
                      <tr
                        key={`${it.kind}-${it.empresa_uid}-${it.created_at}-${idx}`}
                        className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-slate-50/40 dark:bg-gray-800/20'}
                      >
                        <td className="px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {it.empresa_label}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-700 dark:text-gray-200 whitespace-nowrap">{it.title}</td>
                        <td className="px-3 py-2 text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">
                          {it.subtitle || '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-semibold text-slate-500 dark:text-gray-400 whitespace-nowrap">
                          {it.created_at ? new Date(it.created_at).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {recentTotalPages > 1 && (
                <div className="mt-2 flex items-center justify-end gap-3 overflow-x-auto scrollbar-hidden whitespace-nowrap text-xs text-slate-600 dark:text-gray-300">
                  <span className="whitespace-nowrap">{recentRangeLabel}</span>

                  <button
                    type="button"
                    onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
                    disabled={recentPage === 1}
                    aria-label="Página anterior"
                    title="Página anterior"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="whitespace-nowrap font-semibold">
                    {recentPage}/{recentTotalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setRecentPage((p) => Math.min(recentTotalPages, p + 1))}
                    disabled={recentPage === recentTotalPages}
                    aria-label="Próxima página"
                    title="Próxima página"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {!loadingRecent && recentItems.length === 0 && (
          <div className="py-6 text-center text-sm text-slate-500 dark:text-gray-400">Nenhum registro encontrado no período.</div>
        )}

        {(loadingComparacao || comparacaoTotal > 0) && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-3 md:p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Comparação entre ambientes</h3>
                <div className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                  Ranking de quem mais produziu no período ({recentKind === 'cadastro' ? 'Cadastros' : recentKind === 'atendimento' ? 'Atendimentos' : 'Demandas'})
                </div>
                {ambienteFilterUid !== 'all' && (
                  <div className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
                    Dica: para comparar ambientes, use “Todos os ambientes”.
                  </div>
                )}
              </div>

              <div className="shrink-0 mt-2 sm:mt-0">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-gray-800 dark:text-gray-200">
                  Total: {new Intl.NumberFormat('pt-BR').format(comparacaoTotal)}
                </span>
              </div>
            </div>

            {loadingComparacao ? (
              <div className="mt-4 text-sm text-slate-500 dark:text-gray-400">Carregando comparação...</div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="h-[360px] w-full rounded-lg border border-slate-200 p-3 dark:border-gray-700">
                  <div className="text-sm font-bold text-slate-700 dark:text-gray-200">Ranking</div>
                  <div className="mt-2 h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={comparacaoAmbientes.slice(0, 12).map((x) => ({
                          ...x,
                          shortLabel: formatShortLabel(x.label, 14),
                        }))}
                        margin={{ top: 14, right: 10, left: 10, bottom: 70 }}
                      >
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                        <XAxis
                          dataKey="shortLabel"
                          interval={0}
                          angle={-35}
                          textAnchor="end"
                          height={70}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          axisLine={{ stroke: '#e2e8f0' }}
                          tickLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          axisLine={{ stroke: '#e2e8f0' }}
                          tickLine={{ stroke: '#e2e8f0' }}
                        />
                        <Tooltip
                          formatter={(value: any) => [new Intl.NumberFormat('pt-BR').format(Number(value || 0)), 'Total']}
                          labelFormatter={(label: any, payload: any) => {
                            const full = payload?.[0]?.payload?.label;
                            return full ? String(full) : String(label || '');
                          }}
                        />
                        <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                          {comparacaoAmbientes.slice(0, 12).map((_, idx) => (
                            <Cell key={`bar-cell-${idx}`} fill={comparacaoColors[idx % comparacaoColors.length]} />
                          ))}
                          <LabelList
                            dataKey="total"
                            position="top"
                            formatter={(v: any) => new Intl.NumberFormat('pt-BR').format(Number(v || 0))}
                            className="fill-slate-600"
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="h-[360px] w-full rounded-lg border border-slate-200 p-3 dark:border-gray-700">
                  <div className="text-sm font-bold text-slate-700 dark:text-gray-200">Proporção</div>
                  <div className="mt-2 h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={comparacaoPieData}
                          dataKey="total"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={92}
                          innerRadius={46}
                          paddingAngle={2}
                        >
                          {comparacaoPieData.map((_, idx) => (
                            <Cell key={`cell-${idx}`} fill={comparacaoColors[idx % comparacaoColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, name: any) => [new Intl.NumberFormat('pt-BR').format(Number(value || 0)), String(name || '')]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={44}
                          formatter={(value: any) => <span className="text-xs text-slate-600 dark:text-gray-300">{String(value || '')}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {(loadingComparacaoLinha || comparacaoLinhaHasData) && (
                  <div className="h-[360px] w-full rounded-lg border border-slate-200 p-3 dark:border-gray-700 lg:col-span-2">
                    <div className="text-sm font-bold text-slate-700 dark:text-gray-200">Evolução no período</div>
                    {loadingComparacaoLinha ? (
                      <div className="mt-4 text-sm text-slate-500 dark:text-gray-400">Carregando evolução...</div>
                    ) : (
                      <div className="mt-2 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={comparacaoLinha} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              axisLine={{ stroke: '#e2e8f0' }}
                              tickLine={{ stroke: '#e2e8f0' }}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              axisLine={{ stroke: '#e2e8f0' }}
                              tickLine={{ stroke: '#e2e8f0' }}
                            />
                            <Tooltip
                              formatter={(value: any, name: any) => {
                                const env = topComparacaoAmbientes.find((e) => e.uid === String(name));
                                return [new Intl.NumberFormat('pt-BR').format(Number(value || 0)), env?.label || String(name || '')];
                              }}
                              labelFormatter={(label: any) => `Data: ${String(label || '')}`}
                            />
                            <Legend
                              formatter={(value: any) => {
                                const env = topComparacaoAmbientes.find((e) => e.uid === String(value));
                                return (
                                  <span className="text-xs text-slate-600 dark:text-gray-300">{env?.label || String(value || '')}</span>
                                );
                              }}
                            />
                            {topComparacaoAmbientes.map((env, idx) => (
                              <Line
                                key={env.uid}
                                type="monotone"
                                dataKey={env.uid}
                                stroke={comparacaoColors[idx % comparacaoColors.length]}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
