import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { Building2, ChevronLeft, RefreshCw, Plus, BarChart3 } from 'lucide-react';

import { useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useAuthStore } from '../../store/useAuthStore';
import { useCompanyStore } from '../../store/useCompanyStore';
import { toast } from '../../components/ui/use-toast';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';

type Company = {
  uid: string;
  nome: string | null;
  apelido?: string | null;
  cidade?: string | null;
  estado?: string | null;
  logo?: string | null;
};

type CompanySummary = {
  empresa_uid: string;
  eleitores: number;
  atendimentos: number;
  demandas: number;
  agendamentos: number;
};

type CompanyKpiRow = {
  empresa_uid: string;
  eleitores: any;
  atendimentos: any;
  demandas: any;
  agendamentos: any;
};

export function SelectCompany() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const authStore = useAuthStore();

  const setCompany = useCompanyStore((s) => s.setCompany);
  const activeCompany = useCompanyStore((s) => s.company);

  const activeCompanyUid =
    activeCompany?.uid ||
    localStorage.getItem('active_empresa_uid') ||
    localStorage.getItem('empresa_uid') ||
    '';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [summaries, setSummaries] = useState<Record<string, CompanySummary>>({});
  const [selectingCompanyUid, setSelectingCompanyUid] = useState<string | null>(null);
  const [refreshingCompanyUids, setRefreshingCompanyUids] = useState<Set<string>>(new Set());

  const [createCompanyQuotaOverride, setCreateCompanyQuotaOverride] = useState<number | null>(null);
  const [linkedEmpresaCount, setLinkedEmpresaCount] = useState<number>(0);
  const [remainingQuotaRpc, setRemainingQuotaRpc] = useState<number | null>(null);

  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [createCompanyError, setCreateCompanyError] = useState<string | null>(null);
  const [createCompanyForm, setCreateCompanyForm] = useState({
    nome: '',
    apelido: '',
    cidade: '',
    estado: '',
  });

  const canSeeMultiAmbientes = companies.length > 1;

  const createCompanyQuota =
    createCompanyQuotaOverride ?? Number((user as any)?.cota_criar_empresas ?? 0);
  const canCreateCompany = !!user?.permissoes?.includes('create_company');
  const remainingCreateCompanyQuota = Math.max(createCompanyQuota - linkedEmpresaCount, 0);
  const remainingQuotaUi = remainingQuotaRpc ?? remainingCreateCompanyQuota;
  const canOpenCreateCompany = canCreateCompany && remainingQuotaUi > 0;

  const getSuggestedCompanyName = () => {
    const byStore = (activeCompany as any)?.nome;
    if (byStore && String(byStore).trim()) return String(byStore).trim();
    const byList = companies.find((c) => !!activeCompanyUid && c.uid === activeCompanyUid)?.nome;
    if (byList && String(byList).trim()) return String(byList).trim();
    return '';
  };

  const fetchSummariesForCompanies = useCallback(
    async (empresaUids: string[]): Promise<Record<string, CompanySummary>> => {
      if (!empresaUids.length) return {};

      const { data, error } = await supabaseClient.rpc('get_companies_kpis', {
        p_empresa_uids: empresaUids,
      });

      if (error) throw error;

      const rows = (data || []) as CompanyKpiRow[];
      return rows.reduce((acc, row) => {
        const empresa_uid = String(row.empresa_uid);
        acc[empresa_uid] = {
          empresa_uid,
          eleitores: Number(row.eleitores) || 0,
          atendimentos: Number(row.atendimentos) || 0,
          demandas: Number(row.demandas) || 0,
          agendamentos: Number(row.agendamentos) || 0,
        };
        return acc;
      }, {} as Record<string, CompanySummary>);
    },
    []
  );

  const sortedCompanies = useMemo(() => {
    const baseEmpresaUid = user?.empresa_uid;
    return [...companies].sort((a, b) => {
      const aIsBase = !!baseEmpresaUid && a.uid === baseEmpresaUid;
      const bIsBase = !!baseEmpresaUid && b.uid === baseEmpresaUid;
      if (aIsBase && !bIsBase) return -1;
      if (!aIsBase && bIsBase) return 1;
      return (a.nome || '').localeCompare(b.nome || '');
    });
  }, [companies, user?.empresa_uid]);

  useEffect(() => {
    let isMounted = true;

    async function loadCompaniesAndSummaries() {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data: quotaRow, error: quotaError } = await supabaseClient
          .from('gbp_usuarios')
          .select('cota_criar_empresas')
          .eq('uid', user.uid)
          .single();

        if (!quotaError && quotaRow && isMounted) {
          const quotaValue = Number((quotaRow as any)?.cota_criar_empresas ?? 0);
          setCreateCompanyQuotaOverride(quotaValue);

          const currentUser = authStore.user || user;
          const updatedUser = {
            ...currentUser,
            cota_criar_empresas: quotaValue,
          };
          authStore.setUser(updatedUser);
          localStorage.setItem('gbp_user', JSON.stringify(updatedUser));
        }

        try {
          const { data: remainingData, error: remainingError } = await supabaseClient.rpc(
            'get_remaining_company_quota_for_user',
            {
              p_user_uid: user.uid,
            }
          );
          if (!remainingError && remainingData && Array.isArray(remainingData) && remainingData[0]) {
            const v = Number((remainingData[0] as any)?.remaining_quota ?? 0);
            if (isMounted) setRemainingQuotaRpc(Number.isFinite(v) ? v : 0);
          }
        } catch {
          // Se o RPC não existir ainda no banco, a UI continua usando o cálculo local.
        }

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
        if (isMounted) setLinkedEmpresaCount(empresaUidList.length);
        if (empresaUidList.length === 0) {
          if (isMounted) {
            setCompanies([]);
            setSummaries({});
          }
          return;
        }

        const { data: companiesData, error: companiesError } = await supabaseClient
          .from('gbp_empresas')
          .select('uid,nome,apelido,cidade,estado,logo')
          .in('uid', empresaUidList);

        if (companiesError) throw companiesError;

        const companyList = (companiesData || []) as Company[];
        if (!isMounted) return;
        setCompanies(companyList);

        // KPIs em 1 chamada (RPC)
        const summariesMap = await fetchSummariesForCompanies(companyList.map((c) => c.uid));
        if (!isMounted) return;
        setSummaries(summariesMap);
      } catch (e: any) {
        console.error('[SelectCompany] Erro ao carregar empresas:', e);
        if (isMounted) setError(e?.message || 'Erro ao carregar empresas');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadCompaniesAndSummaries();
    return () => {
      isMounted = false;
    };
  }, [user?.uid, user?.empresa_uid, fetchSummariesForCompanies]);

  useEffect(() => {
    if (!user?.uid) return;

    let isActive = true;
    let timeout: any;

    const scheduleRefresh = () => {
      if (!isActive) return;
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        window.dispatchEvent(new Event('gbp_refresh_companies'));
      }, 400);
    };

    const channel = supabaseClient
      .channel(`select-company-realtime-${user.uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gbp_usuarios',
          filter: `uid=eq.${user.uid}`,
        },
        () => scheduleRefresh()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gbp_usuario_empresas',
          filter: `user_uid=eq.${user.uid}`,
        },
        () => scheduleRefresh()
      )
      .subscribe();

    const handler = async () => {
      try {
        try {
          const { data: remainingData, error: remainingError } = await supabaseClient.rpc(
            'get_remaining_company_quota_for_user',
            {
              p_user_uid: user.uid,
            }
          );
          if (!remainingError && remainingData && Array.isArray(remainingData) && remainingData[0]) {
            const v = Number((remainingData[0] as any)?.remaining_quota ?? 0);
            setRemainingQuotaRpc(Number.isFinite(v) ? v : 0);
          }
        } catch {
          // ignore
        }

        const empresaUids = new Set<string>();
        if (user.empresa_uid) empresaUids.add(user.empresa_uid);

        const { data: extraLinks, error: extraError } = await supabaseClient
          .from('gbp_usuario_empresas')
          .select('empresa_uid')
          .eq('user_uid', user.uid)
          .eq('ativo', true);

        if (extraError) return;

        (extraLinks || []).forEach((l: any) => {
          if (l?.empresa_uid) empresaUids.add(l.empresa_uid);
        });

        const empresaUidList = Array.from(empresaUids);
        setLinkedEmpresaCount(empresaUidList.length);
        if (empresaUidList.length === 0) {
          setCompanies([]);
          setSummaries({});
          return;
        }

        const { data: companiesData, error: companiesError } = await supabaseClient
          .from('gbp_empresas')
          .select('uid,nome,apelido,cidade,estado,logo')
          .in('uid', empresaUidList);

        if (companiesError) return;

        const companyList = (companiesData || []) as Company[];
        setCompanies(companyList);

        const summariesMap = await fetchSummariesForCompanies(companyList.map((c) => c.uid));
        setSummaries(summariesMap);
      } catch (e) {
        console.error('[SelectCompany] Falha ao atualizar empresas/cota (realtime):', e);
      }
    };

    window.addEventListener('gbp_refresh_companies', handler);
    return () => {
      isActive = false;
      if (timeout) clearTimeout(timeout);
      window.removeEventListener('gbp_refresh_companies', handler);
      supabaseClient.removeChannel(channel);
    };
  }, [user?.uid, user?.empresa_uid, fetchSummariesForCompanies]);

  const handleCreateCompany = async () => {
    if (!user?.uid) return;

    try {
      const { data: quotaRow, error: quotaError } = await supabaseClient
        .from('gbp_usuarios')
        .select('cota_criar_empresas')
        .eq('uid', user.uid)
        .single();

      if (!quotaError && quotaRow) {
        const quotaValue = Number((quotaRow as any)?.cota_criar_empresas ?? 0);
        setCreateCompanyQuotaOverride(quotaValue);
      }

      const empresaUids = new Set<string>();
      if (user.empresa_uid) empresaUids.add(user.empresa_uid);

      const { data: extraLinks, error: extraError } = await supabaseClient
        .from('gbp_usuario_empresas')
        .select('empresa_uid')
        .eq('user_uid', user.uid)
        .eq('ativo', true);

      if (!extraError) {
        (extraLinks || []).forEach((l: any) => {
          if (l?.empresa_uid) empresaUids.add(l.empresa_uid);
        });
      }

      const quotaValue =
        (!quotaError && quotaRow)
          ? Number((quotaRow as any)?.cota_criar_empresas ?? 0)
          : createCompanyQuota;
      const remainingLive = Math.max(quotaValue - empresaUids.size, 0);

      if (remainingLive <= 0) {
        setCreateCompanyError('Você atingiu o limite de criação de empresas.');
        return;
      }
    } catch (e) {
      console.warn('[SelectCompany] Não foi possível validar cota em tempo real:', e);
    }

    if (remainingQuotaUi <= 0) {
      setCreateCompanyError('Você atingiu o limite de criação de empresas.');
      return;
    }

    if (!createCompanyForm.nome.trim()) {
      setCreateCompanyError('Informe o nome da empresa');
      return;
    }
    if (!createCompanyForm.apelido.trim()) {
      setCreateCompanyError('Informe o apelido');
      return;
    }

    setIsCreatingCompany(true);
    setCreateCompanyError(null);
    try {
      const nomeCriado = createCompanyForm.nome.trim();
      const apelidoCriado = createCompanyForm.apelido.trim();

      const { data, error: rpcError } = await supabaseClient.rpc('create_company_for_user', {
        p_user_uid: user.uid,
        p_nome: nomeCriado,
        p_apelido: apelidoCriado,
        p_cidade: createCompanyForm.cidade || null,
        p_estado: createCompanyForm.estado || null,
      });

      if (rpcError) throw rpcError;
      const row = (data || [])[0] as any;

      const remainingFromRpc = Number(row?.remaining_quota);
      if (Number.isFinite(remainingFromRpc)) {
        setRemainingQuotaRpc(Math.max(remainingFromRpc, 0));
      }

      const createdEmpresaUid = String(row?.empresa_uid || '').trim();
      const nextUids = [...companies.map((c) => c.uid), createdEmpresaUid].filter(Boolean);

      const { data: companiesData, error: companiesError } = await supabaseClient
        .from('gbp_empresas')
        .select('uid,nome,apelido,cidade,estado,logo')
        .in('uid', nextUids);

      if (companiesError) throw companiesError;
      const companyList = (companiesData || []) as Company[];
      setCompanies(companyList);

      const summariesMap = await fetchSummariesForCompanies(companyList.map((c) => c.uid));
      setSummaries(summariesMap);

      setCreateCompanyForm({ nome: '', apelido: '', cidade: '', estado: '' });
      setIsCreateCompanyOpen(false);

      window.dispatchEvent(new Event('gbp_refresh_companies'));

      toast({
        title: 'Sucesso',
        description: `Empresa "${apelidoCriado}" criada com sucesso.`,
        variant: 'success',
        duration: 5000,
      });
    } catch (e: any) {
      console.error('[SelectCompany] Erro ao criar empresa:', e);
      const msg = String(e?.message || '').trim();
      setCreateCompanyError(msg || 'Erro ao criar empresa');

      if (msg.toLowerCase().includes('cota de criação de empresas esgotada')) {
        setRemainingQuotaRpc(0);
        setIsCreateCompanyOpen(false);
        window.dispatchEvent(new Event('gbp_refresh_companies'));
      } else {
        window.dispatchEvent(new Event('gbp_refresh_companies'));
      }
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const handleSelectCompany = (companyUid: string) => {
    const selected = companies.find((c) => c.uid === companyUid);
    if (!selected) return;

    setSelectingCompanyUid(companyUid);
    try {
      setCompany(selected as any);
      localStorage.setItem('empresa_uid', companyUid);
      localStorage.setItem('active_empresa_uid', companyUid);

      queryClient.cancelQueries();
      queryClient.clear();

      const currentUser = authStore.user || user;
      if (currentUser) {
        authStore.setUser({
          ...currentUser,
          empresa_uid: companyUid,
        });
      }

      window.location.replace('/app');
    } finally {
      setSelectingCompanyUid(null);
    }
  };

  const handleRefreshCompanySummary = async (empresaUid: string) => {
    setRefreshingCompanyUids((prev) => {
      const next = new Set(prev);
      next.add(empresaUid);
      return next;
    });

    try {
      const map = await fetchSummariesForCompanies([empresaUid]);
      const s = map[empresaUid];
      if (s) {
        setSummaries((prev) => ({ ...prev, [empresaUid]: s }));
      }
    } catch (e) {
      console.error('[SelectCompany] Erro ao atualizar números da empresa:', e);
    } finally {
      setRefreshingCompanyUids((prev) => {
        const next = new Set(prev);
        next.delete(empresaUid);
        return next;
      });
    }
  };

  const currentCompany = useMemo(() => {
    if (!user?.empresa_uid) return null;
    return companies.find((c) => c.uid === user.empresa_uid) || null;
  }, [companies, user?.empresa_uid]);

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="flex-1 rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/30 p-3 md:p-4 flex flex-col gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm px-3 py-2 md:px-4 md:py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/app')}
                aria-label="Voltar"
                title="Voltar"
                className="inline-flex items-center justify-center rounded-md p-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700/40 dark:hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="truncate text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Meus ambientes</h1>
            </div>

            <div className="flex items-center justify-end gap-1.5">
              {canSeeMultiAmbientes && (
                <button
                  type="button"
                  onClick={() => navigate('/app/gerenciamento/ambientes')}
                  aria-label="Multi-Ambientes"
                  title="Multi-Ambientes"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
              )}

              {currentCompany && (
                <div className="hidden sm:flex items-center justify-end">
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                    <span className="whitespace-nowrap text-slate-500 dark:text-gray-400">Ambiente:</span>
                    <span className="truncate max-w-[180px] text-slate-700 dark:text-gray-100">{currentCompany.nome || 'Empresa'}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-3 md:p-4 flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white dark:bg-gray-800 shadow-sm p-5 animate-pulse"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-xl bg-slate-200 dark:bg-gray-700" />
                      <div className="min-w-0">
                        <div className="h-4 w-40 rounded bg-slate-200 dark:bg-gray-700" />
                        <div className="mt-2 h-3 w-28 rounded bg-slate-200 dark:bg-gray-700" />
                        <div className="mt-2 h-3 w-20 rounded bg-slate-200 dark:bg-gray-700" />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-gray-700" />
                      <div className="h-5 w-14 rounded-full bg-slate-200 dark:bg-gray-700" />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <div
                        key={j}
                        className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-3 py-2"
                      >
                        <div className="h-4 w-24 rounded bg-slate-200 dark:bg-gray-700" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : sortedCompanies.length === 0 ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-900/40 ring-1 ring-gray-200 dark:ring-gray-700">
                <Building2 className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="mt-4 text-base font-semibold text-gray-900 dark:text-white">Nenhuma empresa disponível</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Você não possui vínculo com nenhuma empresa ativa.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {canOpenCreateCompany && (
                <button
                  type="button"
                  onClick={() => {
                    setCreateCompanyError(null);
                    setCreateCompanyForm((prev) => {
                      if (String(prev.nome || '').trim()) return prev;
                      const suggested = getSuggestedCompanyName();
                      if (!suggested) return prev;
                      return { ...prev, nome: suggested };
                    });
                    setIsCreateCompanyOpen(true);
                  }}
                  className="group relative flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-slate-300/80 bg-gradient-to-br from-white to-slate-50/70 text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-gray-700 dark:from-gray-900/20 dark:to-gray-900/5 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:text-white"
                  aria-label="Criar novo ambiente"
                  title="Clique para criar um novo ambiente"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm ring-1 ring-blue-200/70 transition-transform group-hover:scale-[1.02] dark:ring-blue-400/20">
                      <Plus className="h-5 w-5" />
                    </div>
                    <div className="text-base font-semibold tracking-tight">Novo Ambiente</div>
                    <div className="text-xs text-slate-500 dark:text-gray-400">
                      Disponível: <span className="font-semibold text-slate-700 dark:text-gray-200">{remainingQuotaUi}</span>
                    </div>
                  </div>

                  <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span className="rounded-full bg-slate-900/90 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                      Clique para criar
                    </span>
                  </div>
                </button>
              )}

              {sortedCompanies.map((c) => {
                const s = summaries[c.uid];
                const isCurrent = c.uid === user?.empresa_uid;
                const isSelecting = selectingCompanyUid === c.uid;
                const isRefreshing = refreshingCompanyUids.has(c.uid);

                const initials = c.nome
                  ? c.nome
                      .split(' ')
                      .map((word) => word.charAt(0).toUpperCase())
                      .join('')
                  : '';

                return (
                  <button
                    key={c.uid}
                    type="button"
                    onClick={() => handleSelectCompany(c.uid)}
                    disabled={isSelecting}
                    aria-label={`Entrar na empresa ${c.nome || 'Empresa'}${c.apelido ? ` (${c.apelido})` : ''}`}
                    aria-busy={isSelecting}
                    className={`group text-left rounded-2xl border bg-white dark:bg-gray-800 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-70 disabled:hover:translate-y-0 ${
                      isCurrent
                        ? 'border-blue-500 ring-2 ring-blue-300 bg-blue-50/40 dark:border-blue-400 dark:ring-blue-500/30 dark:bg-blue-950/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            {c.logo ? (
                              <img
                                src={c.logo}
                                alt={c.nome || 'Empresa'}
                                className="h-11 w-11 rounded-xl object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                              />
                            ) : (
                              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-sm font-bold ring-1 ring-blue-200">
                                {initials}
                              </div>
                            )}
                            <div
                              className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-white ${
                                isSelecting ? 'bg-blue-500' : 'bg-emerald-500'
                              }`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="text-base font-semibold text-gray-900 dark:text-white truncate">{c.nome || 'Empresa'}</div>
                            {c.apelido && (
                              <div className="mt-0.5 text-xs font-medium text-gray-700 dark:text-gray-300/90 truncate">{c.apelido}</div>
                            )}
                            <div className="mt-1 text-xs text-slate-500 dark:text-gray-400 truncate">
                              {(c.cidade || '') + (c.estado ? ` • ${c.estado}` : '')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!isRefreshing) void handleRefreshCompanySummary(c.uid);
                            }}
                            aria-label="Recarregar números"
                            title="Recarregar números"
                            disabled={isRefreshing || isSelecting}
                            className="inline-flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-full border border-slate-200/70 bg-white/70 text-slate-500 transition-colors hover:bg-white hover:text-slate-700 disabled:opacity-40 dark:bg-gray-900/20 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800/50"
                          >
                            <RefreshCw className={`h-4 w-4 sm:h-3.5 sm:w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                          </button>

                          {isCurrent ? (
                            <span className="inline-flex max-w-full items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold text-blue-700 dark:border-blue-500/40 dark:bg-blue-900/20 dark:text-blue-100">
                              Aqui
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition-colors group-hover:bg-blue-700 whitespace-nowrap">
                              Entrar
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-3 py-2">
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-gray-400">Eleitores</div>
                          <div className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">{s?.eleitores ?? '-'}</div>
                        </div>
                        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-3 py-2">
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-gray-400">Atendimentos</div>
                          <div className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">{s?.atendimentos ?? '-'}</div>
                        </div>
                        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-3 py-2">
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-gray-400">Demandas</div>
                          <div className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">{s?.demandas ?? '-'}</div>
                        </div>
                        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-3 py-2">
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-gray-400">Agendamentos</div>
                          <div className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">{s?.agendamentos ?? '-'}</div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Dialog
          open={isCreateCompanyOpen}
          onOpenChange={(open) => {
            if (open) {
              setCreateCompanyError(null);
              setCreateCompanyForm((prev) => {
                if (String(prev.nome || '').trim()) return prev;
                const suggested = getSuggestedCompanyName();
                if (!suggested) return prev;
                return { ...prev, nome: suggested };
              });
            }
            setIsCreateCompanyOpen(open);
          }}
        >
          <DialogContent className="sm:max-w-[560px] bg-white dark:bg-gray-900">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Criar nova empresa
              </DialogTitle>
              <DialogDescription>Você ainda pode criar {remainingQuotaUi} empresa(s).</DialogDescription>
            </DialogHeader>

            {createCompanyError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{createCompanyError}</div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-gray-200">Nome da empresa</label>
                <Input
                  value={createCompanyForm.nome}
                  onChange={(e) => setCreateCompanyForm((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex.: Associação Amigos do Bairro"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-gray-200">Apelido *</label>
                <Input
                  value={createCompanyForm.apelido}
                  onChange={(e) => setCreateCompanyForm((p) => ({ ...p, apelido: e.target.value }))}
                  placeholder="Ex.: Filial 1, ONG Maria, Matriz"
                  required
                />
                <div className="text-[12px] text-slate-500 dark:text-gray-400">Use um nome curto para identificar este ambiente.</div>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-gray-200">Cidade</label>
                  <Input
                    value={createCompanyForm.cidade}
                    onChange={(e) => setCreateCompanyForm((p) => ({ ...p, cidade: e.target.value }))}
                    placeholder="Ex.: Recife"
                  />
                </div>

                <div className="space-y-1.5 w-[88px]">
                  <label className="text-sm font-medium text-slate-700 dark:text-gray-200">UF</label>
                  <Input
                    value={createCompanyForm.estado}
                    onChange={(e) => {
                      const raw = e.target.value || '';
                      const next = raw
                        .toUpperCase()
                        .replace(/[^A-Z]/g, '')
                        .slice(0, 2);
                      setCreateCompanyForm((p) => ({ ...p, estado: next }));
                    }}
                    placeholder="PE"
                    maxLength={2}
                    className="w-[88px] uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsCreateCompanyOpen(false)} disabled={isCreatingCompany}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleCreateCompany} disabled={isCreatingCompany || remainingQuotaUi <= 0}>
                {isCreatingCompany ? 'Criando...' : 'Criar empresa'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}