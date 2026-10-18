import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  Building2,
  Clock,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';
import { Button } from '../../../components/ui/button';

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

const TIPO_LABEL: Record<string, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  outros: 'Outros',
};

const TIPO_CLS: Record<string, string> = {
  pix: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  boleto: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  outros: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

interface Pagamento {
  id: string;
  assinatura_id: string;
  valor: number;
  tipo_pagamento: string;
  status: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  gateway_url: string | null;
}

interface Assinatura {
  id: string;
  empresa_uid: string;
}

interface Empresa {
  uid: string;
  nome: string | null;
  apelido: string | null;
  cidade: string | null;
  estado: string | null;
}

export default function RelatorioPagamentos() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') === 'aberto' ? 'aberto' : 'paid';
  const meses = Math.min(Math.max(Number(searchParams.get('meses')) || 1, 1), 12);

  const [loading, setLoading] = useState(true);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [empresaPorAss, setEmpresaPorAss] = useState<Record<string, Empresa>>({});

  const ePago = status === 'paid';
  const titulo = ePago ? 'Pagamentos recebidos' : 'Pagamentos em aberto';
  const Icone = ePago ? Banknote : Clock;
  const corIcone = ePago
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-amber-600 dark:text-amber-400';
  const fundoIcone = ePago
    ? 'bg-emerald-100 dark:bg-emerald-900/40'
    : 'bg-amber-100 dark:bg-amber-900/40';

  useEffect(() => {
    (async () => {
      setLoading(true);
      const ini = new Date();
      ini.setDate(1);
      ini.setMonth(ini.getMonth() - (meses - 1));
      ini.setHours(0, 0, 0, 0);

      const { data: pags } = await supabaseClient
        .from('gbp_pagamentos')
        .select('*')
        .in('status', ePago ? ['paid'] : ['pending', 'overdue'])
        .gte('data_vencimento', ini.toISOString())
        .order('data_vencimento', { ascending: false });
      const lista = (pags || []) as Pagamento[];
      setPagamentos(lista);

      const assIds = [...new Set(lista.map((p) => p.assinatura_id))];
      if (assIds.length > 0) {
        const { data: ass } = await supabaseClient
          .from('gbp_assinaturas')
          .select('id,empresa_uid')
          .in('id', assIds);
        const assRows = (ass || []) as Assinatura[];
        const empIds = [...new Set(assRows.map((a) => a.empresa_uid))];
        if (empIds.length > 0) {
          const { data: emps } = await supabaseClient
            .from('gbp_empresas')
            .select('uid,nome,apelido,cidade,estado')
            .in('uid', empIds);
          const empMap = Object.fromEntries(
            ((emps || []) as Empresa[]).map((e) => [e.uid, e])
          );
          setEmpresaPorAss(
            Object.fromEntries(
              assRows
                .filter((a) => empMap[a.empresa_uid])
                .map((a) => [a.id, empMap[a.empresa_uid]])
            )
          );
        }
      }
      setLoading(false);
    })();
  }, [ePago, meses]);

  const total = useMemo(
    () => pagamentos.reduce((s, p) => s + (Number(p.valor) || 0), 0),
    [pagamentos]
  );

  // Agrupa por mês de vencimento (mais recente primeiro)
  const grupos = useMemo(() => {
    const map = new Map<string, Pagamento[]>();
    pagamentos.forEach((p) => {
      const k = p.data_vencimento?.slice(0, 7) || 'sem-data';
      map.set(k, [...(map.get(k) || []), p]);
    });
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([k, itens]) => ({
        key: k,
        label:
          k === 'sem-data'
            ? 'Sem data'
            : new Date(`${k}-01T12:00:00`)
                .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
                .replace('.', ''),
        itens,
      }));
  }, [pagamentos]);

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="px-3 py-4 sm:p-6 w-full space-y-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/app/admin/credenciados?aba=relatorio')}
            className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 shrink-0"
            title="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span
            className={`shrink-0 h-10 w-10 rounded-full ${fundoIcone} flex items-center justify-center`}
          >
            <Icone className={`h-5 w-5 ${corIcone}`} />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate leading-tight">
              {titulo}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {meses === 1 ? 'Mês atual' : `Últimos ${meses} meses`} ·{' '}
              {pagamentos.length} cobrança(s)
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-gray-400">Total</p>
            <p
              className={`text-lg font-bold leading-tight ${
                ePago ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {fmtBRL(total)}
            </p>
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : pagamentos.length === 0 ? (
            <div className="text-center py-12">
              <Icone className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                Nenhum pagamento {ePago ? 'recebido' : 'em aberto'} no período.
              </p>
            </div>
          ) : (
            grupos.map((g) => (
              <div key={g.key}>
                <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700/50 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                    {g.label}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {g.itens.length} cobrança(s) ·{' '}
                    {fmtBRL(
                      g.itens.reduce((s, p) => s + (Number(p.valor) || 0), 0)
                    )}
                  </span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {g.itens.map((p) => {
                    const emp = empresaPorAss[p.assinatura_id];
                    return (
                      <div
                        key={p.id}
                        onClick={() =>
                          emp &&
                          navigate(`/app/admin/credenciados/${emp.uid}`)
                        }
                        className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      >
                        <span className="shrink-0 h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-indigo-500" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {emp
                              ? emp.nome || emp.apelido || 'Sem nome'
                              : 'Empresa removida'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                            <span
                              className={`px-1.5 py-px rounded font-medium ${
                                TIPO_CLS[p.tipo_pagamento] || TIPO_CLS.outros
                              }`}
                            >
                              {TIPO_LABEL[p.tipo_pagamento] || p.tipo_pagamento}
                            </span>
                            <span className="truncate">
                              venc. {fmtData(p.data_vencimento)}
                            </span>
                            {ePago && p.data_pagamento && (
                              <span className="text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                · pago {fmtData(p.data_pagamento)}
                              </span>
                            )}
                            {!ePago && p.status === 'overdue' && (
                              <span className="px-1.5 py-px rounded font-medium bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                vencido
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-sm font-bold whitespace-nowrap ${
                            ePago
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {fmtBRL(p.valor)}
                          {ePago && ' ✅'}
                        </span>
                        {p.gateway_url && (
                          <a
                            href={p.gateway_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-indigo-600 shrink-0"
                            title="Abrir cobrança"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
