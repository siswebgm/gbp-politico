import type { AssistantContext, AssistantModule, AssistantQuery, GroupItem } from '../types';
import { normalize, getDateRange, findByName, extractValue, getLastLimit, toAccentInsensitiveRegex } from '../utils';
import { supabaseClient } from '../../../lib/supabase';
import { exportToExcel, exportToPdf } from '../export';

interface AtendimentoRow {
  uid: string;
  descricao?: string | null;
  status?: string | null;
  tipo_de_atendimento?: string | null;
  data_atendimento?: string | null;
  created_at?: string | null;
  categoria_uid?: string | null;
  eleitor_uid?: string | null;
  eleitor?: string | null;
  whatsapp?: string | null;
  usuario_uid?: string | null;
  responsavel?: string | null;
  empresa_uid: string;
  bairro?: string | null;
  cidade?: string | null;
  logradouro?: string | null;
}

const STOP_KEYWORDS = [
  'categoria', 'tipo', 'status', 'situacao', 'periodo', 'por', 'hoje', 'ontem', 'semana', 'mes',
  'ano', 'dia', 'dias', 'meses', 'anos', 'semanas', 'esse', 'esta', 'este', 'essa',
  'ultimos', 'ultimas', 'proximos', 'proximas', 'quantos', 'quantidade', 'total',
  'atendimentos', 'atendimento', 'solicitacao', 'solicitacoes', 'lista', 'quem', 'sao', 'sao',
  'liste', 'mostre', 'exiba', 'baixar', 'pdf', 'excel', 'e', 'ou', 'com', 'em', 'na', 'no',
  'responsavel', 'responsável', 'usuario', 'usuário', 'bairro', 'cidade', 'logradouro', 'rua'
];


const getStatuses = (text: string): string[] => {
  const norm = normalize(text);
  const found = new Set<string>();
  if (/\bpendentes?\b/.test(norm)) found.add('Pendente');
  if (/(?:em\s+)?andamentos?\b/.test(norm)) found.add('Em andamento');
  if (/\b(concluidos?|resolvidos?)\b/.test(norm)) found.add('Concluído');
  if (/\b(finalizados?|feitos?)\b/.test(norm)) found.add('Finalizado');
  if (/\bcancelados?\b/.test(norm)) found.add('Cancelado');
  return Array.from(found);
};

const getGroupBy = (text: string): string | undefined => {
  const norm = normalize(text);
  if (/\bpor\s+(categoria|categorias)\b/.test(norm)) return 'categoria_uid';
  if (/\bpor\s+(tipo|tipos)\b/.test(norm)) return 'tipo_de_atendimento';
  if (/\bpor\s+(status|situacao|situação)\b/.test(norm)) return 'status';
  if (/\bpor\s+(responsavel|responsável|usuario|usuário|usuario)\b/.test(norm)) return 'usuario_uid';
  if (/\bpor\s+(bairro|bairros)\b/.test(norm)) return 'bairro';
  if (/\bpor\s+(cidade|cidades)\b/.test(norm)) return 'cidade';
  return undefined;
};

export const attendancesModule: AssistantModule = {
  name: 'attendances',
  title: 'Atendimentos',
  keywords: ['atendimento', 'atendimentos', 'solicitacao', 'solicitacoes', 'pendente', 'pendentes', 'resolvido', 'resolvidos', 'concluido', 'concluidos', 'finalizado', 'finalizados', 'andamento', 'andamentos', 'cancelado', 'cancelados'],
  primaryKeywords: ['atendimento', 'atendimentos', 'solicitacao', 'solicitacoes'],
  quickQuestions: [
    'Quantos atendimentos essa semana?',
    'Atendimentos desse mês',
    'Atendimentos pendentes',
    'Atendimentos por categoria',
    'Atendimentos por status',
  ],

  parse(text, context) {
    const { dateFrom, dateTo, label } = getDateRange(text);
    const statuses = getStatuses(text);
    const groupBy = getGroupBy(text);

    const filters: Record<string, any> = { dateFrom, dateTo };
    if (statuses.length > 0) filters.status = statuses;

    const tipoValue = extractValue(text, 'tipo', STOP_KEYWORDS);
    if (tipoValue) filters.tipo_de_atendimento = tipoValue;

    const categoriaValue = extractValue(text, 'categoria', STOP_KEYWORDS);
    if (categoriaValue) {
      const found = findByName(context.categories, categoriaValue);
      if (found) filters.categoria_uid = found.uid;
    }

    const responsavelValue = extractValue(text, 'responsavel', STOP_KEYWORDS);
    if (responsavelValue) {
      const found = findByName(context.responsaveis, responsavelValue);
      if (found) filters.usuario_uid = found.uid;
    }

    const bairroValue = extractValue(text, 'bairro', STOP_KEYWORDS);
    if (bairroValue) filters.bairro = bairroValue;

    const cidadeValue = extractValue(text, 'cidade', STOP_KEYWORDS);
    if (cidadeValue) filters.cidade = cidadeValue;

    const logradouroValue = extractValue(text, 'logradouro', STOP_KEYWORDS);
    if (logradouroValue) filters.logradouro = logradouroValue;

    const norm = normalize(text);
    const isList = /\b(liste|listar|mostre|mostrar|exiba|exibir|ver|mostrar)\b/.test(norm);
    const isCount = /\b(quantos|quantidade|total|quantas|numero)\b/.test(norm);

    let limit: number | undefined = getLastLimit(text, ['atendimento', 'solicitacao'], ['atendimentos', 'solicitacoes']);
    const isLast = limit != null;

    let action: AssistantQuery['action'] = 'count';
    if (groupBy) action = 'group';
    else if ((isList && !isCount) || isLast) {
      action = 'list';
    }

    const parts: string[] = [];
    if (isLast) {
      parts.push(limit === 1 ? 'Último atendimento' : `Últimos ${limit} atendimentos`);
      if (label && label !== 'todos os tempos') parts.push(`(${label})`);
    } else {
      parts.push(action === 'group' ? 'Agrupamento' : action === 'list' ? 'Lista' : 'Quantidade');
      parts.push(`de atendimentos (${label})`);
    }
    if (statuses.length > 0) parts.push(`com status "${statuses.join('", "')}"`);
    if (tipoValue) parts.push(`do tipo "${tipoValue}"`);
    if (filters.categoria_uid) {
      const cat = context.categories.find((c) => c.uid === filters.categoria_uid);
      parts.push(`na categoria ${cat?.nome || filters.categoria_uid}`);
    } else if (categoriaValue) {
      parts.push(`com categoria próxima a "${categoriaValue}"`);
    }
    if (filters.usuario_uid) {
      const resp = context.responsaveis.find((r) => r.uid === filters.usuario_uid);
      parts.push(`responsável ${resp?.nome || filters.usuario_uid}`);
    } else if (responsavelValue) {
      parts.push(`com responsável próximo a "${responsavelValue}"`);
    }
    if (bairroValue) parts.push(`no bairro ${bairroValue}`);
    if (cidadeValue) parts.push(`na cidade ${cidadeValue}`);
    if (logradouroValue) parts.push(`no logradouro ${logradouroValue}`);

    return {
      module: 'attendances',
      action,
      filters,
      groupBy,
      limit,
      description: parts.join(' '),
      displayTitle: 'Atendimentos',
    };
  },

  async execute(query, context) {
    const dateField = 'data_atendimento';
    let sb = supabaseClient
      .from('gbp_atendimentos')
      .select('*', { count: query.action === 'count' ? 'exact' : undefined })
      .eq('empresa_uid', context.empresaUid);

    if (query.filters.status) sb = applyStatusFilter(sb, query.filters.status as string);
    if (query.filters.tipo_de_atendimento) sb = sb.ilike('tipo_de_atendimento', `%${query.filters.tipo_de_atendimento}%`);
    if (query.filters.categoria_uid) sb = sb.eq('categoria_uid', query.filters.categoria_uid);
    if (query.filters.usuario_uid) sb = sb.eq('usuario_uid', query.filters.usuario_uid);
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
      .order('data_atendimento', { ascending: false })
      .limit(query.limit ?? (query.action === 'list' ? 20 : 10000));
    if (error) throw new Error(error.message);

    const rows = (data || []) as AtendimentoRow[];

    if (query.action === 'group') {
      const groups = groupRows(rows, query.groupBy, context);
      return { ...query, count: rows.length, groups };
    }

    const displayRows = rows.slice(0, 20).map((row) => ({
      ...row,
      categoria_nome:
        row.categoria_uid
          ? context.categories.find((c) => c.uid === row.categoria_uid)?.nome || '-'
          : '-',
      responsavel_nome:
        row.usuario_uid
          ? context.responsaveis.find((r) => r.uid === row.usuario_uid)?.nome || '-'
          : row.responsavel || '-',
      eleitor_nome: row.eleitor || '-',
      eleitor_whatsapp: row.whatsapp || '-',
    }));

    return { ...query, count: rows.length, rows: displayRows };
  },

  async export(result, format, context) {
    const dateField = 'data_atendimento';
    let sb = supabaseClient
      .from('gbp_atendimentos')
      .select('*')
      .eq('empresa_uid', context.empresaUid);

    if (result.filters.status) sb = applyStatusFilter(sb, result.filters.status as string);
    if (result.filters.tipo_de_atendimento) sb = sb.ilike('tipo_de_atendimento', `%${result.filters.tipo_de_atendimento}%`);
    if (result.filters.categoria_uid) sb = sb.eq('categoria_uid', result.filters.categoria_uid);
    if (result.filters.usuario_uid) sb = sb.eq('usuario_uid', result.filters.usuario_uid);
    if (result.filters.bairro) sb = sb.filter('bairro', 'imatch', toAccentInsensitiveRegex(result.filters.bairro));
    if (result.filters.cidade) sb = sb.filter('cidade', 'imatch', toAccentInsensitiveRegex(result.filters.cidade));
    if (result.filters.logradouro) sb = sb.filter('logradouro', 'imatch', toAccentInsensitiveRegex(result.filters.logradouro));
    if (result.filters.dateFrom) sb = sb.gte(dateField, result.filters.dateFrom);
    if (result.filters.dateTo) sb = sb.lt(dateField, result.filters.dateTo);

    const { data, error } = await sb.order('data_atendimento', { ascending: false }).limit(result.limit ?? 10000);
    if (error) throw new Error(error.message);

    const rows = (data || []) as AtendimentoRow[];

    const getCat = (uid?: string | null) =>
      uid ? context.categories.find((c) => c.uid === uid)?.nome || '-' : '-';
    const getResp = (uid?: string | null) =>
      uid ? context.responsaveis.find((r) => r.uid === uid)?.nome || '-' : '-';

    const sheetData = rows.map((row) => ({
      Descrição: row.descricao || '',
      Status: row.status || '',
      Tipo: row.tipo_de_atendimento || '',
      Categoria: getCat(row.categoria_uid),
      Responsável: getResp(row.usuario_uid) || row.responsavel || '',
      Nome: row.eleitor || '',
      WhatsApp: row.whatsapp || '',
      Cidade: row.cidade || '',
      Bairro: row.bairro || '',
      Logradouro: row.logradouro || '',
      'Data atendimento': row.data_atendimento
        ? new Date(row.data_atendimento).toLocaleDateString('pt-BR')
        : '',
      'Criado em': row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : '',
    }));

    const date = new Date().toISOString().slice(0, 10);
    const fileName = `atendimentos_assistente_${date}`;

    if (format === 'excel') {
      exportToExcel(sheetData, `${fileName}.xlsx`, 'Atendimentos');
      return;
    }

    const headers = ['Descrição', 'Status', 'Tipo', 'Categoria', 'Responsável', 'Nome', 'WhatsApp', 'Cidade', 'Bairro', 'Data atendimento'];
    const body = rows.map((row) => [
      row.descricao,
      row.status,
      row.tipo_de_atendimento,
      getCat(row.categoria_uid),
      getResp(row.usuario_uid) || row.responsavel,
      row.eleitor || '',
      row.whatsapp || '',
      row.cidade,
      row.bairro,
      row.data_atendimento ? new Date(row.data_atendimento).toLocaleDateString('pt-BR') : '',
    ]);

    exportToPdf(headers, body, 'GBP Político - Atendimentos', result.description, rows.length, `${fileName}.pdf`);
  },
};

function applyStatusFilter(query: any, status: string | string[]) {
  const statuses = Array.isArray(status) ? status : [status];
  const variants = new Set<string>();
  statuses.forEach((s) => {
    if (['Concluído', 'Resolvido'].includes(s)) {
      variants.add('Concluído').add('Concluido').add('Resolvido');
    } else if (s === 'Em andamento') {
      variants.add('Em andamento').add('Em Andamento');
    } else {
      variants.add(s);
    }
  });
  return query.or(Array.from(variants).map((s) => `status.ilike.%${s}%`).join(','));
}

function groupRows(rows: AtendimentoRow[], groupBy: string | undefined, context: AssistantContext): GroupItem[] {
  if (!groupBy) return [];

  const map = new Map<string, { label: string; count: number }>();

  rows.forEach((row) => {
    let key = '';
    let label = '';

    if (groupBy === 'categoria_uid') {
      key = row.categoria_uid || '(sem categoria)';
      label = context.categories.find((c) => c.uid === row.categoria_uid)?.nome || key;
    } else if (groupBy === 'usuario_uid') {
      key = row.usuario_uid || '(sem responsável)';
      label = context.responsaveis.find((r) => r.uid === row.usuario_uid)?.nome || row.responsavel || key;
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
