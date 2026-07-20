import type { AssistantModule, AssistantQuery, GroupItem } from '../types';
import { normalize, getDateRange, extractValue } from '../utils';
import { supabaseClient } from '../../../lib/supabase';
import { exportToExcel, exportToPdf } from '../export';

interface EmendaRow {
  uid: string;
  numero_emenda?: string | null;
  ano?: number | null;
  tipo?: string | null;
  descricao?: string | null;
  valor_total?: number | null;
  status?: string | null;
  beneficiario?: string | null;
  beneficiario_cnpj?: string | null;
  beneficiario_municipio?: string | null;
  beneficiario_estado?: string | null;
  data_empenho?: string | null;
  data_liberacao?: string | null;
  data_pagamento?: string | null;
  valor_empenhado?: number | null;
  valor_pago?: number | null;
  observacoes?: string | null;
  created_at?: string | null;
  empresa_uid: string;
}

const STOP_KEYWORDS = [
  'tipo', 'status', 'situacao', 'beneficiario', 'municipio', 'estado', 'ano', 'numero', 'número',
  'periodo', 'por', 'hoje', 'ontem', 'semana', 'mes', 'dia', 'dias', 'meses', 'anos',
  'semanas', 'esse', 'esta', 'este', 'essa', 'ultimos', 'ultimas', 'proximos', 'proximas',
  'quantos', 'quantas', 'quantidade', 'total', 'valor', 'emendas', 'emenda', 'parlamentar', 'parlamentares',
  'lista', 'quem', 'sao', 'sao', 'liste', 'mostre', 'exiba', 'baixar', 'pdf', 'excel',
  'e', 'ou', 'com', 'em', 'na', 'no', 'de'
];

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getStatus = (text: string): string | undefined => {
  const norm = normalize(text);
  if (/\b(aguardando\s+empenho|aguardando)\b/.test(norm)) return 'Aguardando Empenho';
  if (/\bempenhados?\b/.test(norm) || /\bempenhadas?\b/.test(norm)) return 'Empenhado';
  if (/\bliberados?\b/.test(norm) || /\bliberadas?\b/.test(norm)) return 'Liberado';
  if (/\bpagos?\b/.test(norm) || /\bpagas?\b/.test(norm)) return 'Pago';
  if (/\bcancelados?\b/.test(norm) || /\bcanceladas?\b/.test(norm)) return 'Cancelado';
  return undefined;
};

const getAno = (text: string): number | undefined => {
  const norm = normalize(text);
  const match = norm.match(/\b(?:ano\s+)?(20\d{2})\b/);
  return match ? parseInt(match[1], 10) : undefined;
};

const getGroupBy = (text: string): string | undefined => {
  const norm = normalize(text);
  if (/\bpor\s+(tipo|tipos)\b/.test(norm)) return 'tipo';
  if (/\bpor\s+(status|situacao|situação)\b/.test(norm)) return 'status';
  if (/\bpor\s+(ano|anos)\b/.test(norm)) return 'ano';
  if (/\bpor\s+(beneficiario|beneficiários|beneficiarios)\b/.test(norm)) return 'beneficiario';
  if (/\bpor\s+(municipio|município|municipios|cidade)\b/.test(norm)) return 'beneficiario_municipio';
  if (/\bpor\s+(estado|uf)\b/.test(norm)) return 'beneficiario_estado';
  return undefined;
};

export const emendasModule: AssistantModule = {
  name: 'emendas',
  title: 'Emendas Parlamentares',
  keywords: ['emenda', 'emendas', 'emenda parlamentar', 'emendas parlamentares', 'parlamentar', 'parlamentares'],
  primaryKeywords: ['emenda', 'emendas', 'emenda parlamentar', 'emendas parlamentares'],
  quickQuestions: [
    'Quantas emendas esse ano?',
    'Valor total das emendas',
    'Emendas pagas',
    'Emendas por status',
    'Emendas por tipo',
    'Emendas por ano',
  ],

  parse(text) {
    const { dateFrom, dateTo, label } = getDateRange(text);
    const status = getStatus(text);
    const ano = getAno(text);
    const groupBy = getGroupBy(text);

    const filters: Record<string, any> = { dateFrom, dateTo };
    if (status) filters.status = status;
    if (ano) filters.ano = ano;

    const tipoValue = extractValue(text, 'tipo', STOP_KEYWORDS);
    if (tipoValue) filters.tipo = tipoValue;

    const beneficiarioValue = extractValue(text, 'beneficiario', STOP_KEYWORDS);
    if (beneficiarioValue) filters.beneficiario = beneficiarioValue;

    const municipioValue = extractValue(text, 'municipio', STOP_KEYWORDS);
    if (municipioValue) filters.beneficiario_municipio = municipioValue;

    const estadoValue = extractValue(text, 'estado', STOP_KEYWORDS);
    if (estadoValue) filters.beneficiario_estado = estadoValue;

    const isList = /\b(liste|listar|mostre|mostrar|exiba|exibir|ver)\b/.test(normalize(text));
    const isCount = /\b(quantos|quantidade|quantas|numero)\b/.test(normalize(text));

    let action: AssistantQuery['action'] = 'count';
    if (groupBy) action = 'group';
    else if (isList && !isCount) action = 'list';

    const parts: string[] = [];
    parts.push(action === 'group' ? 'Agrupamento' : action === 'list' ? 'Lista' : 'Quantidade');
    parts.push(`de emendas parlamentares (${label})`);
    if (status) parts.push(`com status "${status}"`);
    if (ano) parts.push(`do ano ${ano}`);
    if (tipoValue) parts.push(`do tipo "${tipoValue}"`);
    if (beneficiarioValue) parts.push(`do beneficiário "${beneficiarioValue}"`);
    if (municipioValue) parts.push(`no município ${municipioValue}`);
    if (estadoValue) parts.push(`no estado ${estadoValue}`);

    return {
      module: 'emendas',
      action,
      filters,
      groupBy,
      description: parts.join(' '),
      displayTitle: 'Emendas Parlamentares',
    };
  },

  async execute(query, context) {
    const dateField = 'created_at';
    const buildBase = (selectCount: boolean) => {
      let sb = supabaseClient
        .from('gbp_emendas_parlamentares')
        .select('*', { count: selectCount ? 'exact' : undefined })
        .eq('empresa_uid', context.empresaUid)
        .is('deleted_at', null);

      if (query.filters.status) sb = sb.ilike('status', `%${query.filters.status}%`);
      if (query.filters.ano) sb = sb.eq('ano', query.filters.ano);
      if (query.filters.tipo) sb = sb.ilike('tipo', `%${query.filters.tipo}%`);
      if (query.filters.beneficiario) sb = sb.ilike('beneficiario', `%${query.filters.beneficiario}%`);
      if (query.filters.beneficiario_municipio) sb = sb.ilike('beneficiario_municipio', `%${query.filters.beneficiario_municipio}%`);
      if (query.filters.beneficiario_estado) sb = sb.ilike('beneficiario_estado', `%${query.filters.beneficiario_estado}%`);
      if (query.filters.dateFrom) sb = sb.gte(dateField, query.filters.dateFrom);
      if (query.filters.dateTo) sb = sb.lt(dateField, query.filters.dateTo);
      return sb;
    };

    if (query.action === 'count') {
      const { data, count, error } = await buildBase(true);
      if (error) throw new Error(error.message);
      const rows = (data || []) as EmendaRow[];
      const valorTotal = rows.reduce((sum, r) => sum + (Number(r.valor_total) || 0), 0);
      const description = `${query.description} — valor total ${formatCurrency(valorTotal)}`;
      return { ...query, count: count || 0, description };
    }

    const { data, error } = await buildBase(false).order('created_at', { ascending: false }).limit(10000);
    if (error) throw new Error(error.message);

    const rows = (data || []) as EmendaRow[];

    if (query.action === 'group') {
      const groups = groupRows(rows, query.groupBy);
      return { ...query, count: rows.length, groups };
    }

    return { ...query, count: rows.length, rows: rows.slice(0, 20) };
  },

  async export(result, format, context) {
    const dateField = 'created_at';
    let sb = supabaseClient
      .from('gbp_emendas_parlamentares')
      .select('*')
      .eq('empresa_uid', context.empresaUid)
      .is('deleted_at', null);

    if (result.filters.status) sb = sb.ilike('status', `%${result.filters.status}%`);
    if (result.filters.ano) sb = sb.eq('ano', result.filters.ano);
    if (result.filters.tipo) sb = sb.ilike('tipo', `%${result.filters.tipo}%`);
    if (result.filters.beneficiario) sb = sb.ilike('beneficiario', `%${result.filters.beneficiario}%`);
    if (result.filters.beneficiario_municipio) sb = sb.ilike('beneficiario_municipio', `%${result.filters.beneficiario_municipio}%`);
    if (result.filters.beneficiario_estado) sb = sb.ilike('beneficiario_estado', `%${result.filters.beneficiario_estado}%`);
    if (result.filters.dateFrom) sb = sb.gte(dateField, result.filters.dateFrom);
    if (result.filters.dateTo) sb = sb.lt(dateField, result.filters.dateTo);

    const { data, error } = await sb.order('created_at', { ascending: false }).limit(10000);
    if (error) throw new Error(error.message);

    const rows = (data || []) as EmendaRow[];

    const fmt = (v?: number | null) => (v != null ? formatCurrency(Number(v)) : '');
    const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');

    const sheetData = rows.map((row) => ({
      'Nº Emenda': row.numero_emenda || '',
      Ano: row.ano ?? '',
      Tipo: row.tipo || '',
      Status: row.status || '',
      Beneficiário: row.beneficiario || '',
      'CNPJ': row.beneficiario_cnpj || '',
      Município: row.beneficiario_municipio || '',
      Estado: row.beneficiario_estado || '',
      'Valor total': fmt(row.valor_total),
      'Valor empenhado': fmt(row.valor_empenhado),
      'Valor pago': fmt(row.valor_pago),
      'Data empenho': fmtDate(row.data_empenho),
      'Data liberação': fmtDate(row.data_liberacao),
      'Data pagamento': fmtDate(row.data_pagamento),
      Descrição: row.descricao || '',
    }));

    const date = new Date().toISOString().slice(0, 10);
    const fileName = `emendas_assistente_${date}`;

    if (format === 'excel') {
      exportToExcel(sheetData, `${fileName}.xlsx`, 'Emendas');
      return;
    }

    const headers = ['Nº Emenda', 'Ano', 'Tipo', 'Status', 'Beneficiário', 'Município', 'Valor total', 'Valor pago'];
    const body = rows.map((row) => [
      row.numero_emenda,
      row.ano,
      row.tipo,
      row.status,
      row.beneficiario,
      row.beneficiario_municipio,
      fmt(row.valor_total),
      fmt(row.valor_pago),
    ]);

    exportToPdf(headers, body, 'GBP Político - Emendas Parlamentares', result.description, rows.length, `${fileName}.pdf`);
  },
};

function groupRows(rows: EmendaRow[], groupBy: string | undefined): GroupItem[] {
  if (!groupBy) return [];

  const map = new Map<string, { label: string; count: number }>();

  rows.forEach((row) => {
    const key = String((row as any)[groupBy] ?? '(não informado)');
    const current = map.get(key) || { label: key, count: 0 };
    current.count += 1;
    map.set(key, current);
  });

  return Array.from(map.entries())
    .map(([key, value]) => ({ key, label: value.label, count: value.count }))
    .sort((a, b) => b.count - a.count);
}
