import type { AssistantContext, AssistantModule, AssistantQuery, GroupItem } from '../types';
import { normalize, getDateRange, findByName, extractValue } from '../utils';
import { supabaseClient } from '../../../lib/supabase';
import { exportToExcel, exportToPdf } from '../export';

interface ProjetoLeiRow {
  uid: string;
  numero?: string | null;
  ano?: number | null;
  titulo?: string | null;
  autor?: string | null;
  data_protocolo?: string | null;
  status?: string | null;
  ementa?: string | null;
  justificativa?: string | null;
  created_at?: string | null;
  responsavel?: string | null;
  empresa_uid?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  em_andamento: 'Em andamento',
  aprovado: 'Aprovado',
  arquivado: 'Arquivado',
  lei_em_vigor: 'Lei em vigor',
  vetado: 'Vetado',
};

const STOP_KEYWORDS = [
  'status', 'situacao', 'autor', 'responsavel', 'responsável', 'ano', 'numero', 'número',
  'periodo', 'por', 'hoje', 'ontem', 'semana', 'mes', 'dia', 'dias', 'meses', 'anos',
  'semanas', 'esse', 'esta', 'este', 'essa', 'ultimos', 'ultimas', 'proximos', 'proximas',
  'quantos', 'quantas', 'quantidade', 'total', 'projetos', 'projeto', 'lei', 'leis',
  'lista', 'quem', 'sao', 'sao', 'liste', 'mostre', 'exiba', 'baixar', 'pdf', 'excel',
  'e', 'ou', 'com', 'em', 'na', 'no', 'de'
];

const getStatus = (text: string): string | undefined => {
  const norm = normalize(text);
  if (/\b(em\s+andamento|andamento|tramitando|tramitacao|tramitação)\b/.test(norm)) return 'em_andamento';
  if (/\b(aprovados?|aprovada)\b/.test(norm)) return 'aprovado';
  if (/\b(arquivados?|arquivada)\b/.test(norm)) return 'arquivado';
  if (/\b(lei\s+em\s+vigor|em\s+vigor|vigor|vigentes?)\b/.test(norm)) return 'lei_em_vigor';
  if (/\b(vetados?|vetada)\b/.test(norm)) return 'vetado';
  return undefined;
};

const getAno = (text: string): number | undefined => {
  const norm = normalize(text);
  const match = norm.match(/\b(?:ano\s+)?(20\d{2})\b/);
  return match ? parseInt(match[1], 10) : undefined;
};

const getGroupBy = (text: string): string | undefined => {
  const norm = normalize(text);
  if (/\bpor\s+(status|situacao|situação)\b/.test(norm)) return 'status';
  if (/\bpor\s+(autor|autores)\b/.test(norm)) return 'autor';
  if (/\bpor\s+(ano|anos)\b/.test(norm)) return 'ano';
  if (/\bpor\s+(responsavel|responsável|usuario|usuário)\b/.test(norm)) return 'responsavel';
  return undefined;
};

export const projetosLeiModule: AssistantModule = {
  name: 'projetos_lei',
  title: 'Projetos de Lei',
  keywords: ['projeto de lei', 'projetos de lei', 'projeto', 'projetos', 'lei', 'leis', 'proposicao', 'proposicoes', 'proposição', 'proposições'],
  primaryKeywords: ['projeto de lei', 'projetos de lei', 'projeto', 'projetos', 'lei', 'leis', 'proposicao', 'proposicoes'],
  quickQuestions: [
    'Quantos projetos de lei esse ano?',
    'Projetos de lei aprovados',
    'Projetos em andamento',
    'Projetos de lei por status',
    'Projetos de lei por autor',
    'Projetos de lei por ano',
  ],

  parse(text, context) {
    const { dateFrom, dateTo, label } = getDateRange(text);
    const status = getStatus(text);
    const ano = getAno(text);
    const groupBy = getGroupBy(text);

    const filters: Record<string, any> = { dateFrom, dateTo };
    if (status) filters.status = status;
    if (ano) filters.ano = ano;

    const autorValue = extractValue(text, 'autor', STOP_KEYWORDS);
    if (autorValue) filters.autor = autorValue;

    const responsavelValue = extractValue(text, 'responsavel', STOP_KEYWORDS);
    if (responsavelValue) {
      const found = findByName(context.responsaveis, responsavelValue);
      if (found) filters.responsavel = found.uid;
    }

    const isList = /\b(liste|listar|mostre|mostrar|exiba|exibir|ver)\b/.test(normalize(text));
    const isCount = /\b(quantos|quantidade|total|quantas|numero)\b/.test(normalize(text));

    let action: AssistantQuery['action'] = 'count';
    if (groupBy) action = 'group';
    else if (isList && !isCount) action = 'list';

    const parts: string[] = [];
    parts.push(action === 'group' ? 'Agrupamento' : action === 'list' ? 'Lista' : 'Quantidade');
    parts.push(`de projetos de lei (${label})`);
    if (status) parts.push(`com status "${STATUS_LABELS[status] || status}"`);
    if (ano) parts.push(`do ano ${ano}`);
    if (autorValue) parts.push(`do autor "${autorValue}"`);
    if (filters.responsavel) {
      const resp = context.responsaveis.find((r) => r.uid === filters.responsavel);
      parts.push(`responsável ${resp?.nome || filters.responsavel}`);
    }

    return {
      module: 'projetos_lei',
      action,
      filters,
      groupBy,
      description: parts.join(' '),
      displayTitle: 'Projetos de Lei',
    };
  },

  async execute(query, context) {
    const dateField = 'data_protocolo';
    let sb = supabaseClient
      .from('gbp_projetos_lei')
      .select('*', { count: query.action === 'count' ? 'exact' : undefined })
      .eq('empresa_uid', context.empresaUid)
      .is('deleted_at', null);

    if (query.filters.status) sb = sb.eq('status', query.filters.status);
    if (query.filters.ano) sb = sb.eq('ano', query.filters.ano);
    if (query.filters.autor) sb = sb.ilike('autor', `%${query.filters.autor}%`);
    if (query.filters.responsavel) sb = sb.eq('responsavel', query.filters.responsavel);
    if (query.filters.dateFrom) sb = sb.gte(dateField, query.filters.dateFrom);
    if (query.filters.dateTo) sb = sb.lt(dateField, query.filters.dateTo);

    if (query.action === 'count') {
      const { count, error } = await sb;
      if (error) throw new Error(error.message);
      return { ...query, count: count || 0 };
    }

    const { data, error } = await sb.order('data_protocolo', { ascending: false, nullsFirst: false }).limit(10000);
    if (error) throw new Error(error.message);

    const rows = (data || []) as ProjetoLeiRow[];

    if (query.action === 'group') {
      const groups = groupRows(rows, query.groupBy, context);
      return { ...query, count: rows.length, groups };
    }

    const displayRows = rows.slice(0, 20).map((row) => ({
      ...row,
      status_label: row.status ? STATUS_LABELS[row.status] || row.status : '-',
    }));

    return { ...query, count: rows.length, rows: displayRows };
  },

  async export(result, format, context) {
    const dateField = 'data_protocolo';
    let sb = supabaseClient
      .from('gbp_projetos_lei')
      .select('*')
      .eq('empresa_uid', context.empresaUid)
      .is('deleted_at', null);

    if (result.filters.status) sb = sb.eq('status', result.filters.status);
    if (result.filters.ano) sb = sb.eq('ano', result.filters.ano);
    if (result.filters.autor) sb = sb.ilike('autor', `%${result.filters.autor}%`);
    if (result.filters.responsavel) sb = sb.eq('responsavel', result.filters.responsavel);
    if (result.filters.dateFrom) sb = sb.gte(dateField, result.filters.dateFrom);
    if (result.filters.dateTo) sb = sb.lt(dateField, result.filters.dateTo);

    const { data, error } = await sb.order('data_protocolo', { ascending: false, nullsFirst: false }).limit(10000);
    if (error) throw new Error(error.message);

    const rows = (data || []) as ProjetoLeiRow[];

    const getResp = (uid?: string | null) =>
      uid ? context.responsaveis.find((r) => r.uid === uid)?.nome || '-' : '-';

    const sheetData = rows.map((row) => ({
      Número: row.numero || '',
      Ano: row.ano ?? '',
      Título: row.titulo || '',
      Status: row.status ? STATUS_LABELS[row.status] || row.status : '',
      Autor: row.autor || '',
      Responsável: getResp(row.responsavel),
      Ementa: row.ementa || '',
      'Data protocolo': row.data_protocolo
        ? new Date(row.data_protocolo).toLocaleDateString('pt-BR')
        : '',
      'Criado em': row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : '',
    }));

    const date = new Date().toISOString().slice(0, 10);
    const fileName = `projetos_lei_assistente_${date}`;

    if (format === 'excel') {
      exportToExcel(sheetData, `${fileName}.xlsx`, 'Projetos de Lei');
      return;
    }

    const headers = ['Número', 'Ano', 'Título', 'Status', 'Autor', 'Responsável', 'Data protocolo'];
    const body = rows.map((row) => [
      row.numero,
      row.ano,
      row.titulo,
      row.status ? STATUS_LABELS[row.status] || row.status : '',
      row.autor,
      getResp(row.responsavel),
      row.data_protocolo ? new Date(row.data_protocolo).toLocaleDateString('pt-BR') : '',
    ]);

    exportToPdf(headers, body, 'GBP Político - Projetos de Lei', result.description, rows.length, `${fileName}.pdf`);
  },
};

function groupRows(rows: ProjetoLeiRow[], groupBy: string | undefined, context: AssistantContext): GroupItem[] {
  if (!groupBy) return [];

  const map = new Map<string, { label: string; count: number }>();

  rows.forEach((row) => {
    let key = '';
    let label = '';

    if (groupBy === 'status') {
      key = row.status || '(sem status)';
      label = row.status ? STATUS_LABELS[row.status] || row.status : '(sem status)';
    } else if (groupBy === 'responsavel') {
      key = row.responsavel || '(sem responsável)';
      label = context.responsaveis.find((r) => r.uid === row.responsavel)?.nome || key;
    } else {
      key = String((row as any)[groupBy] ?? '(não informado)');
      label = key;
    }

    const current = map.get(key) || { label, count: 0 };
    current.count += 1;
    map.set(key, current);
  });

  return Array.from(map.entries())
    .map(([key, value]) => ({ key, label: value.label, count: value.count }))
    .sort((a, b) => b.count - a.count);
}
