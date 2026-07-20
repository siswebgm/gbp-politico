import type { AssistantModule, AssistantQuery, GroupItem } from '../types';
import { normalize, getDateRange, extractValue, getLastLimit } from '../utils';
import { supabaseClient } from '../../../lib/supabase';
import { exportToExcel, exportToPdf } from '../export';

interface RequerimentoRow {
  uid: string;
  numero?: string | null;
  titulo?: string | null;
  solicitante?: string | null;
  descricao?: string | null;
  tipo?: string | null;
  data_emissao?: string | null;
  solicitacao_especifica?: string | null;
  prioridade?: string | null;
  status?: string | null;
  protocolo?: string | null;
  created_at?: string | null;
  empresa_uid: string;
}

const STOP_KEYWORDS = [
  'tipo', 'status', 'situacao', 'prioridade', 'solicitante', 'protocolo',
  'periodo', 'por', 'hoje', 'ontem', 'semana', 'mes', 'ano', 'dia', 'dias', 'meses', 'anos',
  'semanas', 'esse', 'esta', 'este', 'essa', 'ultimos', 'ultimas', 'proximos', 'proximas',
  'quantos', 'quantas', 'quantidade', 'total', 'requerimentos', 'requerimento',
  'lista', 'quem', 'sao', 'sao', 'liste', 'mostre', 'exiba', 'baixar', 'pdf', 'excel',
  'e', 'ou', 'com', 'em', 'na', 'no', 'de'
];

const getStatus = (text: string): string | undefined => {
  const norm = normalize(text);
  if (/\b(em\s+andamento|andamento|tramitando)\b/.test(norm)) return 'em andamento';
  if (/\b(aprovados?|aprovada)\b/.test(norm)) return 'aprovado';
  if (/\b(pendentes?|aguardando)\b/.test(norm)) return 'pendente';
  if (/\b(concluidos?|concluídos?|finalizados?)\b/.test(norm)) return 'concluido';
  if (/\bprotocolados?\b/.test(norm)) return 'protocolado';
  if (/\b(rejeitados?|indeferidos?)\b/.test(norm)) return 'rejeitado';
  if (/\bcancelados?\b/.test(norm)) return 'cancelado';
  return undefined;
};

const getPrioridade = (text: string): string | undefined => {
  const norm = normalize(text);
  if (/\b(alta|urgente)\b/.test(norm)) return 'alta';
  if (/\b(media|média)\b/.test(norm)) return 'média';
  if (/\bbaixa\b/.test(norm)) return 'baixa';
  return undefined;
};

const getGroupBy = (text: string): string | undefined => {
  const norm = normalize(text);
  if (/\bpor\s+(tipo|tipos)\b/.test(norm)) return 'tipo';
  if (/\bpor\s+(status|situacao|situação)\b/.test(norm)) return 'status';
  if (/\bpor\s+(prioridade|prioridades)\b/.test(norm)) return 'prioridade';
  if (/\bpor\s+(solicitante|solicitantes)\b/.test(norm)) return 'solicitante';
  return undefined;
};

export const requerimentosModule: AssistantModule = {
  name: 'requerimentos',
  title: 'Requerimentos',
  keywords: ['requerimento', 'requerimentos'],
  primaryKeywords: ['requerimento', 'requerimentos'],
  quickQuestions: [
    'Quantos requerimentos essa semana?',
    'Requerimentos desse mês',
    'Requerimentos pendentes',
    'Requerimentos por status',
    'Requerimentos por tipo',
    'Requerimentos por prioridade',
  ],

  parse(text) {
    const { dateFrom, dateTo, label } = getDateRange(text);
    const status = getStatus(text);
    const prioridade = getPrioridade(text);
    const groupBy = getGroupBy(text);

    const filters: Record<string, any> = { dateFrom, dateTo };
    if (status) filters.status = status;
    if (prioridade) filters.prioridade = prioridade;

    const tipoValue = extractValue(text, 'tipo', STOP_KEYWORDS);
    if (tipoValue) filters.tipo = tipoValue;

    const solicitanteValue = extractValue(text, 'solicitante', STOP_KEYWORDS);
    if (solicitanteValue) filters.solicitante = solicitanteValue;

    const isList = /\b(liste|listar|mostre|mostrar|exiba|exibir|ver)\b/.test(normalize(text));
    const isCount = /\b(quantos|quantidade|total|quantas|numero)\b/.test(normalize(text));

    let limit: number | undefined = getLastLimit(text, ['requerimento'], ['requerimentos']);
    const isLast = limit != null;

    let action: AssistantQuery['action'] = 'count';
    if (groupBy) action = 'group';
    else if ((isList && !isCount) || isLast) action = 'list';

    const parts: string[] = [];
    if (isLast) {
      parts.push(limit === 1 ? 'Último requerimento' : `Últimos ${limit} requerimentos`);
      if (label && label !== 'todos os tempos') parts.push(`(${label})`);
    } else {
      parts.push(action === 'group' ? 'Agrupamento' : action === 'list' ? 'Lista' : 'Quantidade');
      parts.push(`de requerimentos (${label})`);
    }
    if (status) parts.push(`com status "${status}"`);
    if (prioridade) parts.push(`com prioridade "${prioridade}"`);
    if (tipoValue) parts.push(`do tipo "${tipoValue}"`);
    if (solicitanteValue) parts.push(`do solicitante "${solicitanteValue}"`);

    return {
      module: 'requerimentos',
      action,
      filters,
      groupBy,
      limit,
      description: parts.join(' '),
      displayTitle: 'Requerimentos',
    };
  },

  async execute(query, context) {
    const dateField = 'data_emissao';
    let sb = supabaseClient
      .from('gbp_requerimentos')
      .select('*', { count: query.action === 'count' ? 'exact' : undefined })
      .eq('empresa_uid', context.empresaUid)
      .is('deleted_at', null);

    if (query.filters.status) sb = sb.ilike('status', `%${query.filters.status}%`);
    if (query.filters.prioridade) sb = sb.ilike('prioridade', `%${query.filters.prioridade}%`);
    if (query.filters.tipo) sb = sb.ilike('tipo', `%${query.filters.tipo}%`);
    if (query.filters.solicitante) sb = sb.ilike('solicitante', `%${query.filters.solicitante}%`);
    if (query.filters.dateFrom) sb = sb.gte(dateField, query.filters.dateFrom);
    if (query.filters.dateTo) sb = sb.lt(dateField, query.filters.dateTo);

    if (query.action === 'count') {
      const { count, error } = await sb;
      if (error) throw new Error(error.message);
      return { ...query, count: count || 0 };
    }

    const { data, error } = await sb
      .order('data_emissao', { ascending: false, nullsFirst: false })
      .limit(query.limit ?? (query.action === 'list' ? 20 : 10000));
    if (error) throw new Error(error.message);

    const rows = (data || []) as RequerimentoRow[];

    if (query.action === 'group') {
      const groups = groupRows(rows, query.groupBy);
      return { ...query, count: rows.length, groups };
    }

    return { ...query, count: rows.length, rows };
  },

  async export(result, format, context) {
    const dateField = 'data_emissao';
    let sb = supabaseClient
      .from('gbp_requerimentos')
      .select('*')
      .eq('empresa_uid', context.empresaUid)
      .is('deleted_at', null);

    if (result.filters.status) sb = sb.ilike('status', `%${result.filters.status}%`);
    if (result.filters.prioridade) sb = sb.ilike('prioridade', `%${result.filters.prioridade}%`);
    if (result.filters.tipo) sb = sb.ilike('tipo', `%${result.filters.tipo}%`);
    if (result.filters.solicitante) sb = sb.ilike('solicitante', `%${result.filters.solicitante}%`);
    if (result.filters.dateFrom) sb = sb.gte(dateField, result.filters.dateFrom);
    if (result.filters.dateTo) sb = sb.lt(dateField, result.filters.dateTo);

    const { data, error } = await sb
      .order('data_emissao', { ascending: false, nullsFirst: false })
      .limit(result.limit ?? 10000);
    if (error) throw new Error(error.message);

    const rows = (data || []) as RequerimentoRow[];

    const sheetData = rows.map((row) => ({
      Número: row.numero || '',
      Título: row.titulo || '',
      Solicitante: row.solicitante || '',
      Tipo: row.tipo || '',
      Status: row.status || '',
      Prioridade: row.prioridade || '',
      Protocolo: row.protocolo || '',
      Descrição: row.descricao || '',
      'Data emissão': row.data_emissao
        ? new Date(row.data_emissao).toLocaleDateString('pt-BR')
        : '',
      'Criado em': row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : '',
    }));

    const date = new Date().toISOString().slice(0, 10);
    const fileName = `requerimentos_assistente_${date}`;

    if (format === 'excel') {
      exportToExcel(sheetData, `${fileName}.xlsx`, 'Requerimentos');
      return;
    }

    const headers = ['Número', 'Título', 'Solicitante', 'Tipo', 'Status', 'Prioridade', 'Protocolo', 'Data emissão'];
    const body = rows.map((row) => [
      row.numero,
      row.titulo,
      row.solicitante,
      row.tipo,
      row.status,
      row.prioridade,
      row.protocolo,
      row.data_emissao ? new Date(row.data_emissao).toLocaleDateString('pt-BR') : '',
    ]);

    exportToPdf(headers, body, 'GBP Político - Requerimentos', result.description, rows.length, `${fileName}.pdf`);
  },
};

function groupRows(rows: RequerimentoRow[], groupBy: string | undefined): GroupItem[] {
  if (!groupBy) return [];

  const map = new Map<string, { label: string; count: number }>();

  rows.forEach((row) => {
    const key = String((row as any)[groupBy] || '(não informado)');
    const current = map.get(key) || { label: key, count: 0 };
    current.count += 1;
    map.set(key, current);
  });

  return Array.from(map.entries())
    .map(([key, value]) => ({ key, label: value.label, count: value.count }))
    .sort((a, b) => b.count - a.count);
}
