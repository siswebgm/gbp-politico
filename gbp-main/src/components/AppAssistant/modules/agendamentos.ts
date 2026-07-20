import type { AssistantModule, AssistantQuery, GroupItem } from '../types';
import { normalize, getDateRange, extractValue, getLastLimit } from '../utils';
import { supabaseClient } from '../../../lib/supabase';
import { exportToExcel, exportToPdf } from '../export';

interface AgendamentoRow {
  uid: string;
  title?: string | null;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  type?: string | null;
  location?: string | null;
  status?: string | null;
  all_day?: boolean | null;
  prioridade?: string | null;
  task_responsible?: string | null;
  task_status?: string | null;
  usuario_nome?: string | null;
  usuarios_uid?: string | null;
  created_at?: string | null;
  empresa_uid: string;
}

const STOP_KEYWORDS = [
  'tipo', 'status', 'situacao', 'prioridade', 'responsavel', 'responsável', 'local', 'localizacao',
  'periodo', 'por', 'hoje', 'ontem', 'amanha', 'amanhã', 'semana', 'mes', 'ano', 'dia', 'dias', 'meses', 'anos',
  'semanas', 'esse', 'esta', 'este', 'essa', 'ultimos', 'ultimas', 'proximos', 'proximas',
  'quantos', 'quantas', 'quantidade', 'total', 'agendamentos', 'agendamento', 'agenda', 'compromissos', 'compromisso',
  'eventos', 'evento', 'reunioes', 'reuniao', 'reunião', 'tarefas', 'tarefa',
  'lista', 'quem', 'sao', 'sao', 'liste', 'mostre', 'exiba', 'baixar', 'pdf', 'excel',
  'e', 'ou', 'com', 'em', 'na', 'no', 'de'
];

const getStatus = (text: string): string | undefined => {
  const norm = normalize(text);
  if (/\b(pendentes?|aguardando)\b/.test(norm)) return 'pendente';
  if (/\b(confirmados?|confirmada)\b/.test(norm)) return 'confirmado';
  if (/\b(em\s+andamento|andamento)\b/.test(norm)) return 'em andamento';
  if (/\b(concluidos?|concluídos?|realizados?|finalizados?)\b/.test(norm)) return 'concluido';
  if (/\b(cancelados?|cancelada)\b/.test(norm)) return 'cancelado';
  return undefined;
};

const getVencido = (text: string): boolean => {
  const norm = normalize(text);
  return /\b(vencidos?|atrasados?|em atraso)\b/.test(norm);
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
  if (/\bpor\s+(tipo|tipos)\b/.test(norm)) return 'type';
  if (/\bpor\s+(status|situacao|situação)\b/.test(norm)) return 'status';
  if (/\bpor\s+(prioridade|prioridades)\b/.test(norm)) return 'prioridade';
  if (/\bpor\s+(responsavel|responsável|usuario|usuário)\b/.test(norm)) return 'task_responsible';
  if (/\bpor\s+(local|locais|localizacao|localização)\b/.test(norm)) return 'location';
  return undefined;
};

export const agendamentosModule: AssistantModule = {
  name: 'agendamentos',
  title: 'Agendamentos',
  keywords: ['agendamento', 'agendamentos', 'agenda', 'compromisso', 'compromissos', 'evento', 'eventos', 'reuniao', 'reunioes', 'reunião', 'reuniões'],
  primaryKeywords: ['agendamento', 'agendamentos', 'agenda', 'compromisso', 'compromissos'],
  quickQuestions: [
    'Quantos agendamentos essa semana?',
    'Agendamentos de hoje',
    'Agendamentos pendentes',
    'Agendamentos por tipo',
    'Agendamentos por status',
    'Agendamentos por prioridade',
  ],

  parse(text) {
    const now = new Date();
    let { dateFrom, dateTo, label } = getDateRange(text);
    const status = getStatus(text);
    const prioridade = getPrioridade(text);
    const vencido = getVencido(text);
    const groupBy = getGroupBy(text);

    if (vencido && label === 'todos os tempos') {
      label = `até ${now.toLocaleDateString('pt-BR')}`;
    }

    const filters: Record<string, any> = { dateFrom, dateTo };
    if (status) filters.status = status;
    if (prioridade) filters.prioridade = prioridade;
    if (vencido) filters.vencido = true;

    const tipoValue = extractValue(text, 'tipo', STOP_KEYWORDS);
    if (tipoValue) filters.type = tipoValue;

    const responsavelValue = extractValue(text, 'responsavel', STOP_KEYWORDS);
    if (responsavelValue) filters.task_responsible = responsavelValue;

    const localValue = extractValue(text, 'local', STOP_KEYWORDS);
    if (localValue) filters.location = localValue;

    const isList = /\b(liste|listar|mostre|mostrasse|mostrar|exiba|exibir|ver)\b/.test(normalize(text));
    const isCount = /\b(quantos|quantidade|total|quantas|numero)\b/.test(normalize(text));

    let limit: number | undefined = getLastLimit(text, ['agendamento', 'compromisso', 'evento', 'reuniao'], ['agendamentos', 'compromissos', 'eventos', 'reunioes']);
    const isLast = limit != null;

    let action: AssistantQuery['action'] = 'count';
    if (groupBy) action = 'group';
    else if ((isList && !isCount) || isLast) action = 'list';

    const parts: string[] = [];
    if (isLast) {
      parts.push(limit === 1 ? 'Último agendamento' : `Últimos ${limit} agendamentos`);
      if (label && label !== 'todos os tempos') parts.push(`(${label})`);
    } else {
      parts.push(action === 'group' ? 'Agrupamento' : action === 'list' ? 'Lista' : 'Quantidade');
      parts.push(vencido ? `de agendamentos vencidos (${label})` : `de agendamentos (${label})`);
    }
    if (status) parts.push(`com status "${status}"`);
    if (prioridade) parts.push(`com prioridade "${prioridade}"`);
    if (tipoValue) parts.push(`do tipo "${tipoValue}"`);
    if (responsavelValue) parts.push(`do responsável "${responsavelValue}"`);
    if (localValue) parts.push(`no local "${localValue}"`);

    return {
      module: 'agendamentos',
      action,
      filters,
      groupBy,
      limit,
      description: parts.join(' '),
      displayTitle: 'Agendamentos',
    };
  },

  async execute(query, context) {
    const dateField = 'start_time';
    let sb = supabaseClient
      .from('gbp_agendamentos')
      .select('*', { count: query.action === 'count' ? 'exact' : undefined })
      .eq('empresa_uid', context.empresaUid);

    if (query.filters.status) sb = sb.ilike('status', `%${query.filters.status}%`);
    if (query.filters.prioridade) sb = sb.ilike('prioridade', `%${query.filters.prioridade}%`);
    if (query.filters.type) sb = sb.ilike('type', `%${query.filters.type}%`);
    if (query.filters.task_responsible) sb = sb.ilike('task_responsible', `%${query.filters.task_responsible}%`);
    if (query.filters.location) sb = sb.ilike('location', `%${query.filters.location}%`);
    let dateFrom = query.filters.dateFrom;
    let dateTo = query.filters.dateTo;
    if (query.filters.vencido) {
      const nowISO = new Date().toISOString();
      dateTo = dateTo && dateTo < nowISO ? dateTo : nowISO;
    }
    if (dateFrom) sb = sb.gte(dateField, dateFrom);
    if (dateTo) sb = sb.lt(dateField, dateTo);

    if (query.action === 'count' && !query.filters.vencido) {
      const { count, error } = await sb;
      if (error) throw new Error(error.message);
      return { ...query, count: count || 0 };
    }

    const fetchLimit = query.filters.vencido ? 10000 : (query.limit ?? (query.action === 'list' ? 20 : 10000));
    const { data, error } = await sb
      .order('start_time', { ascending: false })
      .limit(fetchLimit);
    if (error) throw new Error(error.message);

    let rows = (data || []) as AgendamentoRow[];

    if (query.filters.vencido) {
      const now = new Date();
      const doneStatus = ['concluido', 'concluído', 'concluida', 'concluída', 'cancelado', 'cancelada'];
      const normStatus = (s?: string | null) =>
        s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : '';
      rows = rows.filter((row) => {
        if (!row.start_time) return false;
        const start = new Date(row.start_time);
        if (isNaN(start.getTime())) return false;
        const status = normStatus(row.status);
        return start < now && !doneStatus.includes(status);
      });
    }

    if (query.action === 'count') {
      return { ...query, count: rows.length };
    }

    if (query.action === 'group') {
      const groups = groupRows(rows, query.groupBy);
      return { ...query, count: rows.length, groups };
    }

    const displayRows = query.action === 'list' ? rows.slice(0, query.limit ?? 20) : rows;
    return { ...query, count: rows.length, rows: displayRows };
  },

  async export(result, format, context) {
    const dateField = 'start_time';
    let sb = supabaseClient
      .from('gbp_agendamentos')
      .select('*')
      .eq('empresa_uid', context.empresaUid);

    if (result.filters.status) sb = sb.ilike('status', `%${result.filters.status}%`);
    if (result.filters.prioridade) sb = sb.ilike('prioridade', `%${result.filters.prioridade}%`);
    if (result.filters.type) sb = sb.ilike('type', `%${result.filters.type}%`);
    if (result.filters.task_responsible) sb = sb.ilike('task_responsible', `%${result.filters.task_responsible}%`);
    if (result.filters.location) sb = sb.ilike('location', `%${result.filters.location}%`);
    let dateFrom = result.filters.dateFrom;
    let dateTo = result.filters.dateTo;
    if (result.filters.vencido) {
      const nowISO = new Date().toISOString();
      dateTo = dateTo && dateTo < nowISO ? dateTo : nowISO;
    }
    if (dateFrom) sb = sb.gte(dateField, dateFrom);
    if (dateTo) sb = sb.lt(dateField, dateTo);

    const { data, error } = await sb
      .order('start_time', { ascending: false })
      .limit(result.limit ?? 10000);
    if (error) throw new Error(error.message);

    let rows = (data || []) as AgendamentoRow[];

    if (result.filters.vencido) {
      const now = new Date();
      const doneStatus = ['concluido', 'concluído', 'concluida', 'concluída', 'cancelado', 'cancelada'];
      const normStatus = (s?: string | null) =>
        s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : '';
      rows = rows.filter((row) => {
        if (!row.start_time) return false;
        const start = new Date(row.start_time);
        if (isNaN(start.getTime())) return false;
        const status = normStatus(row.status);
        return start < now && !doneStatus.includes(status);
      });
    }

    const fmtDateTime = (d?: string | null) =>
      d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';

    const sheetData = rows.map((row) => ({
      Título: row.title || '',
      Tipo: row.type || '',
      Status: row.status || '',
      Prioridade: row.prioridade || '',
      Responsável: row.task_responsible || row.usuario_nome || '',
      Local: row.location || '',
      'Início': fmtDateTime(row.start_time),
      'Fim': fmtDateTime(row.end_time),
      'Dia inteiro': row.all_day ? 'Sim' : 'Não',
      Descrição: row.description || '',
    }));

    const date = new Date().toISOString().slice(0, 10);
    const fileName = `agendamentos_assistente_${date}`;

    if (format === 'excel') {
      exportToExcel(sheetData, `${fileName}.xlsx`, 'Agendamentos');
      return;
    }

    const headers = ['Título', 'Tipo', 'Status', 'Prioridade', 'Responsável', 'Local', 'Início', 'Fim'];
    const body = rows.map((row) => [
      row.title,
      row.type,
      row.status,
      row.prioridade,
      row.task_responsible || row.usuario_nome,
      row.location,
      fmtDateTime(row.start_time),
      fmtDateTime(row.end_time),
    ]);

    exportToPdf(headers, body, 'GBP Político - Agendamentos', result.description, rows.length, `${fileName}.pdf`);
  },
};

function groupRows(rows: AgendamentoRow[], groupBy: string | undefined): GroupItem[] {
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
