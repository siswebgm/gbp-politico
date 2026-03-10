import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CalendarDays, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, RefreshCw } from 'lucide-react';
import InputMask from 'react-input-mask';

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

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
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

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    setRecentPage(1);
  }, [recentKind, preset, customStart, customEnd, ambienteFilterUid]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(recentItems.length / recentItemsPerPage));
    if (recentPage > totalPages) setRecentPage(totalPages);
  }, [recentItems.length, recentItemsPerPage, recentPage]);

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
      </div>
    </div>
  );
}
