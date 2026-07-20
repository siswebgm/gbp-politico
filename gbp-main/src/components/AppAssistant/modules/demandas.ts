import type { AssistantModule, AssistantQuery, GroupItem } from '../types';
import { normalize, getDateRange, extractValue, getLastLimit, toAccentInsensitiveRegex } from '../utils';
import { supabaseClient } from '../../../lib/supabase';
import { exportToExcel, exportToPdf } from '../export';

interface DemandaRow {
  uid: string;
  tipo_de_demanda: string;
  descricao_do_problema: string;
  status: string;
  nivel_de_urgencia: string;
  bairro: string;
  cidade: string;
  logradouro: string;
  numero?: string;
  criado_em: string;
  atualizado_em?: string | null;
  excluido?: boolean;
  arquivado?: boolean;
}

const STOP_KEYWORDS = [
  'tipo', 'status', 'situacao', 'urgencia', 'urgente', 'bairro', 'cidade', 'logradouro', 'rua',
  'periodo', 'por', 'hoje', 'ontem', 'semana', 'mes', 'ano', 'dia', 'dias', 'meses', 'anos',
  'semanas', 'esse', 'esta', 'este', 'essa', 'ultimos', 'ultimas', 'proximos', 'proximas',
  'quantos', 'quantidade', 'total', 'demandas', 'demanda', 'problema', 'requerimento', 'lista',
  'quem', 'sao', 'sao', 'liste', 'mostre', 'exiba', 'baixar', 'pdf', 'excel', 'e', 'ou', 'com',
  'em', 'na', 'no', 'de'
];


const getStatus = (text: string): string | undefined => {
  const norm = normalize(text);
  if (/\brecebido\b/.test(norm)) return 'recebido';
  if (/\bfeito\s+oficio\b/.test(norm) || /\boficio\b/.test(norm)) return 'feito_oficio';
  if (/\bprotocolado\b/.test(norm)) return 'protocolado';
  if (/\baguardando\b/.test(norm) || /\bpendente\b/.test(norm)) return 'aguardando';
  if (/\bconcluido\b/.test(norm) || /\bconcluído\b/.test(norm) || /\bconcluidas\b/.test(norm)) return 'concluido';
  if (/\bcancelado\b/.test(norm)) return 'cancelado';
  return undefined;
};

const getUrgency = (text: string): string | undefined => {
  const norm = normalize(text);
  if (/\b(baixa|baixa)\s+(urgencia|urgente)\b/.test(norm) || /\b(urgencia)\s+baixa\b/.test(norm)) return 'baixa';
  if (/\bmedia\b/.test(norm) || /\bmédia\b/.test(norm) || /\b(urgencia)\s+media\b/.test(norm)) return 'média';
  if (/\balta\b/.test(norm) || /\b(urgencia)\s+alta\b/.test(norm) || /\burgente\b/.test(norm)) return 'alta';
  return undefined;
};

const getGroupBy = (text: string): string | undefined => {
  const norm = normalize(text);
  if (/\bpor\s+(tipo|tipos)\b/.test(norm)) return 'tipo_de_demanda';
  if (/\bpor\s+(status|situacao|situação)\b/.test(norm)) return 'status';
  if (/\bpor\s+(urgencia|urgencias)\b/.test(norm)) return 'nivel_de_urgencia';
  if (/\bpor\s+(bairro|bairros)\b/.test(norm)) return 'bairro';
  if (/\bpor\s+(cidade|cidades)\b/.test(norm)) return 'cidade';
  return undefined;
};

export const demandasModule: AssistantModule = {
  name: 'demandas',
  title: 'Demandas',
  keywords: ['demanda', 'demandas', 'demandas de rua', 'demanda rua', 'rua', 'problema'],
  primaryKeywords: ['demanda', 'demandas', 'rua', 'problema'],
  quickQuestions: [
    'Quantas demandas essa semana?',
    'Demandas desse mês',
    'Demandas concluídas',
    'Demandas por tipo',
    'Demandas por bairro',
    'Demandas urgentes',
  ],

  parse(text) {
    const { dateFrom, dateTo, label } = getDateRange(text);
    const status = getStatus(text);
    const urgency = getUrgency(text);
    const groupBy = getGroupBy(text);

    const filters: Record<string, any> = { dateFrom, dateTo };
    if (status) filters.status = status;
    if (urgency) filters.nivel_de_urgencia = urgency;

    const tipoValue = extractValue(text, 'tipo', STOP_KEYWORDS);
    if (tipoValue) filters.tipo_de_demanda = tipoValue;

    const bairroValue = extractValue(text, 'bairro', STOP_KEYWORDS);
    if (bairroValue) filters.bairro = bairroValue;

    const cidadeValue = extractValue(text, 'cidade', STOP_KEYWORDS);
    if (cidadeValue) filters.cidade = cidadeValue;

    const logradouroValue = extractValue(text, 'logradouro', STOP_KEYWORDS);
    if (logradouroValue) filters.logradouro = logradouroValue;

    const isList = /\b(liste|listar|mostre|mostrar|exiba|exibir|ver|mostrar)\b/.test(normalize(text));
    const isCount = /\b(quantos|quantidade|total|quantas|numero)\b/.test(normalize(text));

    let limit: number | undefined = getLastLimit(text, ['demanda', 'problema', 'demanda de rua'], ['demandas', 'problemas', 'demandas de rua']);
    const isLast = limit != null;

    let action: AssistantQuery['action'] = 'count';
    if (groupBy) action = 'group';
    else if ((isList && !isCount) || isLast) action = 'list';

    const parts: string[] = [];
    if (isLast) {
      parts.push(limit === 1 ? 'Última demanda' : `Últimas ${limit} demandas`);
      if (label && label !== 'todos os tempos') parts.push(`(${label})`);
    } else {
      parts.push(action === 'group' ? 'Agrupamento' : action === 'list' ? 'Lista' : 'Quantidade');
      parts.push(`de demandas (${label})`);
    }
    if (status) parts.push(`com status "${status}"`);
    if (urgency) parts.push(`com urgência "${urgency}"`);
    if (tipoValue) parts.push(`do tipo "${tipoValue}"`);
    if (bairroValue) parts.push(`no bairro ${bairroValue}`);
    if (cidadeValue) parts.push(`na cidade ${cidadeValue}`);
    if (logradouroValue) parts.push(`no logradouro ${logradouroValue}`);

    return {
      module: 'demandas',
      action,
      filters,
      groupBy,
      limit,
      description: parts.join(' '),
      displayTitle: 'Demandas',
    };
  },

  async execute(query, context) {
    const dateField = 'criado_em';
    let sb = supabaseClient
      .from('gbp_demandas_ruas')
      .select('*', { count: query.action === 'count' ? 'exact' : undefined })
      .eq('empresa_uid', context.empresaUid)
      .or('excluido.eq.false,excluido.is.null');

    if (query.filters.status) sb = sb.eq('status', query.filters.status);
    if (query.filters.nivel_de_urgencia) sb = sb.eq('nivel_de_urgencia', query.filters.nivel_de_urgencia);
    if (query.filters.tipo_de_demanda) sb = sb.ilike('tipo_de_demanda', `%${query.filters.tipo_de_demanda}%`);
    if (query.filters.bairro) sb = sb.filter('bairro', 'imatch', toAccentInsensitiveRegex(query.filters.bairro));
    if (query.filters.cidade) sb = sb.filter('cidade', 'imatch', toAccentInsensitiveRegex(query.filters.cidade));
    if (query.filters.logradouro) sb = sb.filter('logradouro', 'imatch', toAccentInsensitiveRegex(query.filters.logradouro));
    if (query.filters.dateFrom) sb = sb.gte(dateField, query.filters.dateFrom);
    if (query.filters.dateTo) sb = sb.lt(dateField, query.filters.dateTo);

    if (query.action === 'count') {
      const { count, error } = await sb;
      if (error) throw new Error(error.message);
      return { ...query, count: count || 0 };
    }

    const { data, error } = await sb
      .order('criado_em', { ascending: false })
      .limit(query.limit ?? (query.action === 'list' ? 20 : 10000));
    if (error) throw new Error(error.message);

    const rows = (data || []) as DemandaRow[];

    if (query.action === 'group') {
      const groups = groupRows(rows, query.groupBy);
      return { ...query, count: rows.length, groups };
    }

    return { ...query, count: rows.length, rows };
  },

  async export(result, format, context) {
    const dateField = 'criado_em';
    let sb = supabaseClient
      .from('gbp_demandas_ruas')
      .select('*')
      .eq('empresa_uid', context.empresaUid)
      .or('excluido.eq.false,excluido.is.null');

    if (result.filters.status) sb = sb.eq('status', result.filters.status);
    if (result.filters.nivel_de_urgencia) sb = sb.eq('nivel_de_urgencia', result.filters.nivel_de_urgencia);
    if (result.filters.tipo_de_demanda) sb = sb.ilike('tipo_de_demanda', `%${result.filters.tipo_de_demanda}%`);
    if (result.filters.bairro) sb = sb.filter('bairro', 'imatch', toAccentInsensitiveRegex(result.filters.bairro));
    if (result.filters.cidade) sb = sb.filter('cidade', 'imatch', toAccentInsensitiveRegex(result.filters.cidade));
    if (result.filters.logradouro) sb = sb.filter('logradouro', 'imatch', toAccentInsensitiveRegex(result.filters.logradouro));
    if (result.filters.dateFrom) sb = sb.gte(dateField, result.filters.dateFrom);
    if (result.filters.dateTo) sb = sb.lt(dateField, result.filters.dateTo);

    const { data, error } = await sb
      .order('criado_em', { ascending: false })
      .limit(result.limit ?? 10000);
    if (error) throw new Error(error.message);

    const rows = (data || []) as DemandaRow[];

    const sheetData = rows.map((row) => ({
      Tipo: row.tipo_de_demanda,
      Descrição: row.descricao_do_problema,
      Status: row.status,
      Urgência: row.nivel_de_urgencia,
      Cidade: row.cidade,
      Bairro: row.bairro,
      Logradouro: row.logradouro,
      'Criado em': row.criado_em ? new Date(row.criado_em).toLocaleDateString('pt-BR') : '',
    }));

    const date = new Date().toISOString().slice(0, 10);
    const fileName = `demandas_assistente_${date}`;

    if (format === 'excel') {
      exportToExcel(sheetData, `${fileName}.xlsx`, 'Demandas');
      return;
    }

    const headers = ['Tipo', 'Descrição', 'Status', 'Urgência', 'Cidade', 'Bairro', 'Criado em'];
    const body = rows.map((row) => [
      row.tipo_de_demanda,
      row.descricao_do_problema,
      row.status,
      row.nivel_de_urgencia,
      row.cidade,
      row.bairro,
      row.criado_em ? new Date(row.criado_em).toLocaleDateString('pt-BR') : '',
    ]);

    exportToPdf(headers, body, 'GBP Político - Demandas', result.description, rows.length, `${fileName}.pdf`);
  },
};

function groupRows(rows: DemandaRow[], groupBy: string | undefined): GroupItem[] {
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
