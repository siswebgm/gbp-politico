import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isAfter, startOfMonth, startOfToday, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity,
  BookOpen,
  CalendarDays,
  CalendarRange,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Files,
} from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useAuth } from '../../../providers/AuthProvider';

interface DocResumo {
  uid: string;
  tipo: 'oficio' | 'projeto_lei' | 'requerimento' | 'emenda';
  tipoLabel: string;
  titulo: string;
  subtitulo: string;
  created_at: string;
  rota: string;
}

const tipoConfig = {
  oficio: { label: 'Ofício', icon: FileText, badge: 'bg-blue-50 text-blue-700 ring-blue-200', rota: '/app/documentos/oficios' },
  projeto_lei: { label: 'Projeto de Lei', icon: BookOpen, badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', rota: '/app/documentos/projetos-lei' },
  requerimento: { label: 'Requerimento', icon: FileSpreadsheet, badge: 'bg-violet-50 text-violet-700 ring-violet-200', rota: '/app/documentos/requerimentos' },
  emenda: { label: 'Emenda', icon: DollarSign, badge: 'bg-amber-50 text-amber-700 ring-amber-200', rota: '/app/documentos/emendas-parlamentares' },
} as const;

export function DocumentsSummary() {
  const navigate = useNavigate();
  const company = useCompanyStore((state) => state.company);
  const { user } = useAuth();
  const isAdmin = user?.nivel_acesso === 'admin';

  const [docs, setDocs] = useState<DocResumo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      if (!company?.uid) return;
      setIsLoading(true);
      const inicioMes = startOfMonth(new Date()).toISOString();

      try {
        const queries: any[] = [
          supabaseClient
            .from('gbp_oficios')
            .select('uid, numero_oficio, requerente_nome, created_at')
            .eq('empresa_uid', company.uid)
            .gte('created_at', inicioMes)
            .order('created_at', { ascending: false }),
        ];
        if (isAdmin) {
          queries.push(
            supabaseClient
              .from('gbp_projetos_lei')
              .select('uid, numero, ano, titulo, autor, created_at')
              .eq('empresa_uid', company.uid)
              .is('deleted_at', null)
              .gte('created_at', inicioMes)
              .order('created_at', { ascending: false }),
            supabaseClient
              .from('gbp_requerimentos')
              .select('uid, numero, titulo, solicitante, created_at')
              .eq('empresa_uid', company.uid)
              .is('deleted_at', null)
              .gte('created_at', inicioMes)
              .order('created_at', { ascending: false }),
            supabaseClient
              .from('gbp_emendas_parlamentares')
              .select('uid, numero_emenda, ano, beneficiario, created_at')
              .eq('empresa_uid', company.uid)
              .is('deleted_at', null)
              .gte('created_at', inicioMes)
              .order('created_at', { ascending: false })
          );
        }

        const [oficiosRes, projetosRes, reqsRes, emendasRes] = await Promise.all(queries);

        const lista: DocResumo[] = [];

        (oficiosRes.data || []).forEach((d: any) =>
          lista.push({
            uid: d.uid,
            tipo: 'oficio',
            tipoLabel: tipoConfig.oficio.label,
            titulo: d.numero_oficio ? `Ofício ${d.numero_oficio}` : 'Ofício',
            subtitulo: d.requerente_nome || '-',
            created_at: d.created_at,
            rota: tipoConfig.oficio.rota,
          })
        );
        (projetosRes?.data || []).forEach((d: any) =>
          lista.push({
            uid: d.uid,
            tipo: 'projeto_lei',
            tipoLabel: tipoConfig.projeto_lei.label,
            titulo: d.titulo || `PL ${d.numero || ''}/${d.ano || ''}`,
            subtitulo: d.autor || (d.numero ? `Nº ${d.numero}/${d.ano}` : '-'),
            created_at: d.created_at,
            rota: tipoConfig.projeto_lei.rota,
          })
        );
        (reqsRes?.data || []).forEach((d: any) =>
          lista.push({
            uid: d.uid,
            tipo: 'requerimento',
            tipoLabel: tipoConfig.requerimento.label,
            titulo: d.titulo || `Requerimento ${d.numero || ''}`,
            subtitulo: d.solicitante || '-',
            created_at: d.created_at,
            rota: tipoConfig.requerimento.rota,
          })
        );
        (emendasRes?.data || []).forEach((d: any) =>
          lista.push({
            uid: d.uid,
            tipo: 'emenda',
            tipoLabel: tipoConfig.emenda.label,
            titulo: `Emenda ${d.numero_emenda || ''}${d.ano ? `/${d.ano}` : ''}`,
            subtitulo: d.beneficiario || '-',
            created_at: d.created_at,
            rota: tipoConfig.emenda.rota,
          })
        );

        lista.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setDocs(lista);
      } catch (e) {
        console.warn('[documentos] erro ao carregar resumo:', e);
      } finally {
        setIsLoading(false);
      }
    }
    carregar();
  }, [company?.uid, isAdmin]);

  const hoje = useMemo(() => docs.filter((d) => isAfter(new Date(d.created_at), startOfToday())).length, [docs]);
  const semana = useMemo(
    () => docs.filter((d) => isAfter(new Date(d.created_at), startOfWeek(new Date(), { weekStartsOn: 1 }))).length,
    [docs]
  );
  const mes = docs.length;

  const stats = [
    { label: 'Hoje', valor: hoje, icon: CalendarDays, cor: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Semana', valor: semana, icon: CalendarRange, cor: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Mês', valor: mes, icon: Files, cor: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {/* Estatísticas */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-4 min-w-0">
              <div className={`p-2 sm:p-2.5 rounded-xl ${s.bg} ring-1 ring-black/5 shrink-0`}>
                <Icon className={`w-5 h-5 ${s.cor}`} />
              </div>
              <div className="min-w-0">
                {isLoading ? (
                  <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : (
                  <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{s.valor}</p>
                )}
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap truncate">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Atividade recente */}
      <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
            Registrados recentemente
          </h2>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
            Nenhum documento registrado este mês.
          </p>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-gray-700/60">
            {docs.slice(0, 8).map((doc) => {
              const cfg = tipoConfig[doc.tipo];
              const Icon = cfg.icon;
              return (
                <li key={`${doc.tipo}-${doc.uid}`}>
                  <button
                    onClick={() => navigate(doc.rota)}
                    className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 rounded-md px-2 -mx-2 transition-colors"
                  >
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ring-1 ring-inset ${cfg.badge} shrink-0`}>
                      <Icon className="w-3.5 h-3.5" />
                      {doc.tipoLabel}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">
                        {doc.titulo}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                        {doc.subtitulo}
                      </span>
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {format(new Date(doc.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
