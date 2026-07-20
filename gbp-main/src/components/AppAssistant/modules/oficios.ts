import type { AssistantContext, AssistantModule, AssistantQuery, GroupItem } from '../types';
import { normalize, getDateRange, findByName, extractValue, getLastLimit, toAccentInsensitiveRegex } from '../utils';
import { supabaseClient } from '../../../lib/supabase';
import { exportToExcel, exportToPdf } from '../export';

interface OficioRow {
  uid: string;
  numero_oficio?: string | null;
  data_solicitacao?: string | null;
  descricao_do_problema?: string | null;
  logradouro?: string | null;
  nivel_de_urgencia?: string | null;
  documento?: string | null;
  tag?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  referencia?: string | null;
  numero?: string | null;
  contato?: string | null;
  cep?: string | null;
  created_at?: string | null;
  requerente_cpf?: string | null;
  requerente_nome?: string | null;
  requerente_whatsapp?: string | null;
  status_solicitacao?: string | null;
  tipo_de_demanda?: string | null;
  responsavel_uid?: string | null;
  responsavel_nome?: string | null;
  eleitor_uid?: string | null;
  visualizou?: boolean | null;
  indicado_uid?: string | null;
  empresa_uid: string;
}

const STOP_KEYWORDS = [
  'tipo', 'status', 'situacao', 'urgencia', 'urgente', 'bairro', 'cidade', 'logradouro', 'rua',
  'responsavel', 'responsável', 'requerente', 'periodo', 'por', 'hoje', 'ontem', 'semana', 'mes',
  'ano', 'dia', 'dias', 'meses', 'anos', 'semanas', 'esse', 'esta', 'este', 'essa',
  'ultimos', 'ultimas', 'proximos', 'proximas', 'quantos', 'quantas', 'quantidade', 'total',
  'oficios', 'oficio', 'ofício', 'ofícios', 'lista', 'quem', 'sao', 'sao', 'liste', 'mostre',
  'exiba', 'baixar', 'pdf', 'excel', 'e', 'ou', 'com', 'em', 'na', 'no', 'de'
];

const getStatus = (text: string): string | undefined => {
  const norm = normalize(text);
  if (/\brecebidos?\b/.test(norm)) return 'recebido';
  if (/\bprotocolados?\b/.test(norm)) return 'protocolado';
  if (/\b(aguardando|pendentes?)\b/.test(norm)) return 'pendente';
  if (/\b(concluidos?|concluídos?|resolvidos?|finalizados?)\b/.test(norm)) return 'concluido';
  if (/\bcancelados?\b/.test(norm)) return 'cancelado';
  return undefined;
};

const getUrgency = (text: string): string | undefined => {
  const norm = normalize(text);
  if (/\bbaixa\b/.test(norm)) return 'baixa';
  if (/\b(media|média)\b/.test(norm)) return 'média';
  if (/\b(alta|urgente)\b/.test(norm)) return 'alta';
  return undefined;
};

const getGroupBy = (text: string): string | undefined => {
  const norm = normalize(text);
  if (/\bpor\s+(tipo|tipos)\b/.test(norm)) return 'tipo_de_demanda';
  if (/\bpor\s+(status|situacao|situação)\b/.test(norm)) return 'status_solicitacao';
  if (/\bpor\s+(urgencia|urgencias|urgência)\b/.test(norm)) return 'nivel_de_urgencia';
  if (/\bpor\s+(bairro|bairros)\b/.test(norm)) return 'bairro';
  if (/\bpor\s+(cidade|cidades)\b/.test(norm)) return 'cidade';
  if (/\bpor\s+(responsavel|responsável|usuario|usuário)\b/.test(norm)) return 'responsavel_uid';
  return undefined;
};

export const oficiosModule: AssistantModule = {
  name: 'oficios',
  title: 'Ofícios',
  keywords: ['oficio', 'oficios', 'ofício', 'ofícios', 'documento', 'documentos', 'protocolo', 'protocolado', 'protocolados'],
  primaryKeywords: ['oficio', 'oficios', 'ofício', 'ofícios'],
  quickQuestions: [
    'Quantos ofícios essa semana?',
    'Ofícios desse mês',
    'Ofícios protocolados',
    'Ofícios por status',
    'Ofícios por tipo',
    'Ofícios por bairro',
  ],

  parse(text, context) {
    const { dateFrom, dateTo, label } = getDateRange(text);
    const status = getStatus(text);
    const urgency = getUrgency(text);
    const groupBy = getGroupBy(text);

    const filters: Record<string, any> = { dateFrom, dateTo };
    if (status) filters.status_solicitacao = status;
    if (urgency) filters.nivel_de_urgencia = urgency;

    const tipoValue = extractValue(text, 'tipo', STOP_KEYWORDS);
    if (tipoValue) filters.tipo_de_demanda = tipoValue;

    const bairroValue = extractValue(text, 'bairro', STOP_KEYWORDS);
    if (bairroValue) filters.bairro = bairroValue;

    const cidadeValue = extractValue(text, 'cidade', STOP_KEYWORDS);
    if (cidadeValue) filters.cidade = cidadeValue;

    const logradouroValue = extractValue(text, 'logradouro', STOP_KEYWORDS);
    if (logradouroValue) filters.logradouro = logradouroValue;

    const responsavelValue = extractValue(text, 'responsavel', STOP_KEYWORDS);
    if (responsavelValue) {
      const found = findByName(context.responsaveis, responsavelValue);
      if (found) filters.responsavel_uid = found.uid;
    }

    const isList = /\b(liste|listar|mostre|mostrar|exiba|exibir|ver)\b/.test(normalize(text));
    const isCount = /\b(quantos|quantidade|total|quantas|numero)\b/.test(normalize(text));

    let limit: number | undefined = getLastLimit(text, ['oficio', 'documento', 'protocolo'], ['oficios', 'documentos', 'protocolos']);
    const isLast = limit != null;

    let action: AssistantQuery['action'] = 'count';
    if (groupBy) action = 'group';
    else if ((isList && !isCount) || isLast) action = 'list';

    const parts: string[] = [];
    if (isLast) {
      parts.push(limit === 1 ? 'Último ofício' : `Últimos ${limit} ofícios`);
      if (label && label !== 'todos os tempos') parts.push(`(${label})`);
    } else {
      parts.push(action === 'group' ? 'Agrupamento' : action === 'list' ? 'Lista' : 'Quantidade');
      parts.push(`de ofícios (${label})`);
    }
    if (status) parts.push(`com status "${status}"`);
    if (urgency) parts.push(`com urgência "${urgency}"`);
    if (tipoValue) parts.push(`do tipo "${tipoValue}"`);
    if (bairroValue) parts.push(`no bairro ${bairroValue}`);
    if (cidadeValue) parts.push(`na cidade ${cidadeValue}`);
    if (logradouroValue) parts.push(`no logradouro ${logradouroValue}`);
    if (filters.responsavel_uid) {
      const resp = context.responsaveis.find((r) => r.uid === filters.responsavel_uid);
      parts.push(`responsável ${resp?.nome || filters.responsavel_uid}`);
    }

    return {
      module: 'oficios',
      action,
      filters,
      groupBy,
      limit,
      description: parts.join(' '),
      displayTitle: 'Ofícios',
    };
  },

  async execute(query, context) {
    const dateField = 'created_at';
    let sb = supabaseClient
      .from('gbp_oficios')
      .select('*', { count: query.action === 'count' ? 'exact' : undefined })
      .eq('empresa_uid', context.empresaUid);

    if (query.filters.status_solicitacao) sb = sb.ilike('status_solicitacao', `%${query.filters.status_solicitacao}%`);
    if (query.filters.nivel_de_urgencia) sb = sb.ilike('nivel_de_urgencia', `%${query.filters.nivel_de_urgencia}%`);
    if (query.filters.tipo_de_demanda) sb = sb.ilike('tipo_de_demanda', `%${query.filters.tipo_de_demanda}%`);
    if (query.filters.bairro) sb = sb.filter('bairro', 'imatch', toAccentInsensitiveRegex(query.filters.bairro));
    if (query.filters.cidade) sb = sb.filter('cidade', 'imatch', toAccentInsensitiveRegex(query.filters.cidade));
    if (query.filters.logradouro) sb = sb.filter('logradouro', 'imatch', toAccentInsensitiveRegex(query.filters.logradouro));
    if (query.filters.responsavel_uid) sb = sb.eq('responsavel_uid', query.filters.responsavel_uid);
    if (query.filters.dateFrom) sb = sb.gte(dateField, query.filters.dateFrom);
    if (query.filters.dateTo) sb = sb.lt(dateField, query.filters.dateTo);

    if (query.action === 'count') {
      const { count, error } = await sb;
      if (error) throw new Error(error.message);
      return { ...query, count: count || 0 };
    }

    const { data, error } = await sb
      .order('created_at', { ascending: false })
      .limit(query.limit ?? (query.action === 'list' ? 20 : 10000));
    if (error) throw new Error(error.message);

    const rows = (data || []) as OficioRow[];

    if (query.action === 'group') {
      const groups = groupRows(rows, query.groupBy, context);
      return { ...query, count: rows.length, groups };
    }

    return { ...query, count: rows.length, rows };
  },

  async export(result, format, context) {
    const dateField = 'created_at';
    let sb = supabaseClient
      .from('gbp_oficios')
      .select('*')
      .eq('empresa_uid', context.empresaUid);

    if (result.filters.status_solicitacao) sb = sb.ilike('status_solicitacao', `%${result.filters.status_solicitacao}%`);
    if (result.filters.nivel_de_urgencia) sb = sb.ilike('nivel_de_urgencia', `%${result.filters.nivel_de_urgencia}%`);
    if (result.filters.tipo_de_demanda) sb = sb.ilike('tipo_de_demanda', `%${result.filters.tipo_de_demanda}%`);
    if (result.filters.bairro) sb = sb.filter('bairro', 'imatch', toAccentInsensitiveRegex(result.filters.bairro));
    if (result.filters.cidade) sb = sb.filter('cidade', 'imatch', toAccentInsensitiveRegex(result.filters.cidade));
    if (result.filters.logradouro) sb = sb.filter('logradouro', 'imatch', toAccentInsensitiveRegex(result.filters.logradouro));
    if (result.filters.responsavel_uid) sb = sb.eq('responsavel_uid', result.filters.responsavel_uid);
    if (result.filters.dateFrom) sb = sb.gte(dateField, result.filters.dateFrom);
    if (result.filters.dateTo) sb = sb.lt(dateField, result.filters.dateTo);

    const { data, error } = await sb
      .order('created_at', { ascending: false })
      .limit(result.limit ?? 10000);
    if (error) throw new Error(error.message);

    const rows = (data || []) as OficioRow[];

    const getResp = (row: OficioRow) =>
      row.responsavel_nome
      || (row.responsavel_uid ? context.responsaveis.find((r) => r.uid === row.responsavel_uid)?.nome : '')
      || '';

    const sheetData = rows.map((row) => ({
      'Nº Ofício': row.numero_oficio || '',
      Tipo: row.tipo_de_demanda || '',
      Descrição: row.descricao_do_problema || '',
      Status: row.status_solicitacao || '',
      Urgência: row.nivel_de_urgencia || '',
      Requerente: row.requerente_nome || '',
      WhatsApp: row.requerente_whatsapp || '',
      Responsável: getResp(row),
      Cidade: row.cidade || '',
      Bairro: row.bairro || '',
      Logradouro: row.logradouro || '',
      'Data solicitação': row.data_solicitacao
        ? new Date(row.data_solicitacao).toLocaleDateString('pt-BR')
        : '',
      'Criado em': row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : '',
    }));

    const date = new Date().toISOString().slice(0, 10);
    const fileName = `oficios_assistente_${date}`;

    if (format === 'excel') {
      exportToExcel(sheetData, `${fileName}.xlsx`, 'Ofícios');
      return;
    }

    const headers = ['Nº Ofício', 'Tipo', 'Status', 'Urgência', 'Requerente', 'Responsável', 'Cidade', 'Bairro', 'Criado em'];
    const body = rows.map((row) => [
      row.numero_oficio,
      row.tipo_de_demanda,
      row.status_solicitacao,
      row.nivel_de_urgencia,
      row.requerente_nome,
      getResp(row),
      row.cidade,
      row.bairro,
      row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : '',
    ]);

    exportToPdf(headers, body, 'GBP Político - Ofícios', result.description, rows.length, `${fileName}.pdf`);
  },
};

function groupRows(rows: OficioRow[], groupBy: string | undefined, context: AssistantContext): GroupItem[] {
  if (!groupBy) return [];

  const map = new Map<string, { label: string; count: number }>();

  rows.forEach((row) => {
    let key = '';
    let label = '';

    if (groupBy === 'responsavel_uid') {
      key = row.responsavel_uid || '(sem responsável)';
      label = row.responsavel_nome
        || context.responsaveis.find((r) => r.uid === row.responsavel_uid)?.nome
        || key;
    } else {
      key = String((row as any)[groupBy] || '(não informado)');
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
